import { spawn } from 'child_process';
import { readFile, writeFile, mkdir, stat, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, relative, resolve } from 'path';
import { exit } from 'process';
import { watch } from 'chokidar';
import { build } from 'esbuild';
import pLimit from 'p-limit';
import {
  minify,
  normalizePath,
  patchContentsForMinify,
  setupMinification,
  writeMinifiedNodesToDisk,
  newTmpDir,
  matchFunctionEntry,
} from './utils';

const prepVercel = async () => {
  try {
    await stat('.vercel/project.json');
  } catch {
    await mkdir('.vercel', { recursive: true });
    await writeFile(
      '.vercel/project.json',
      JSON.stringify({ projectId: '_', orgId: '_', settings: {} }),
    );
  }
  console.log('⚡️');
  console.log("⚡️ Installing 'vercel' CLI...");
  console.log('⚡️');

  const vercelBuild = spawn('npm', ['install', '-D', 'vercel']);

  vercelBuild.stdout.on('data', (data) => {
    const lines: string[] = data.toString().split('\n');
    lines.map((line) => {
      console.log(`▲ ${line}`);
    });
  });

  vercelBuild.stderr.on('data', (data) => {
    const lines: string[] = data.toString().split('\n');
    lines.map((line) => {
      console.log(`▲ ${line}`);
    });
  });

  await new Promise((resolve, reject) => {
    vercelBuild.on('close', (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject();
      }
    });
  });

  console.log('⚡️');
  console.log('⚡️');
  console.log("⚡️ Completed 'npx vercel build'.");
  console.log('⚡️');
};

const buildVercel = async () => {
  console.log('⚡️');
  console.log("⚡️ Building project with 'npx vercel build'...");
  console.log('⚡️');

  const vercelBuild = spawn('npx', ['vercel', 'build']);

  vercelBuild.stdout.on('data', (data) => {
    const lines: string[] = data.toString().split('\n');
    lines.map((line) => {
      console.log(`▲ ${line}`);
    });
  });

  vercelBuild.stderr.on('data', (data) => {
    const lines: string[] = data.toString().split('\n');
    lines.map((line) => {
      console.log(`▲ ${line}`);
    });
  });

  await new Promise((resolve, reject) => {
    vercelBuild.on('close', (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject();
      }
    });
  });

  console.log('⚡️');
  console.log('⚡️');
  console.log("⚡️ Completed 'npx vercel build'.");
  console.log('⚡️');
};

interface MiddlewareManifest {
  sortedMiddleware: string[];
  middleware: Record<
    string,
    {
      env: string[];
      files: string[];
      name: string;
      matchers: { regexp: string }[];
      wasm: [];
      assets: [];
    }
  >;
  functions: Record<
    string,
    {
      env: string[];
      files: string[];
      name: string;
      page: string;
      matchers: { regexp: string }[];
      wasm: [];
      assets: [];
    }
  >;
  version: 2;
}

const transform = async ({
  experimentalMinify,
}: {
  experimentalMinify: boolean;
}) => {
  let config;
  try {
    config = JSON.parse(await readFile('.vercel/output/config.json', 'utf8'));
  } catch {
    console.error(
      "⚡️ ERROR: Could not read the '.vercel/output/config.json' file.",
    );
    exit(1);
  }

  if (config.version !== 3) {
    console.error(
      `⚡️ ERROR: Unknown '.vercel/output/config.json' version. Expected 3 but found ${config.version}.`,
    );
    console.error(
      `⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.`,
    );
    exit(1);
  }

  // RoutesManifest.version and RoutesManifest.basePath are the only fields accessed
  interface RoutesManifest {
    version: 3;
    basePath: string;
  }

  let routesManifest: RoutesManifest;

  try {
    routesManifest = JSON.parse(
      await readFile('.next/routes-manifest.json', 'utf8'),
    );
  } catch {
    console.error(
      '⚡️ ERROR: Could not read ./next/routes-manifest.json files',
    );
    console.error(
      '⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.',
    );
    exit(1);
  }

  if (routesManifest.version !== 3) {
    console.error(
      `⚡️ ERROR: Unknown functions manifest version. Expected 3 but found ${routesManifest.version}.`,
    );
    console.error(
      '⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.',
    );
    exit(1);
  }

  const basePath = routesManifest.basePath ?? '';
  if (basePath !== '') {
    console.log('⚡️ Using basePath ', basePath);
  }

  const functionsDir = resolve('.vercel/output/functions');
  let functionsExist = false;
  try {
    await stat(functionsDir);
    functionsExist = true;
  } catch {}

  if (!functionsExist) {
    console.log('⚡️ No functions detected.');
    return;
  }

  const functionsMap = new Map<string, string>();

  const tmpFunctionsDir = newTmpDir();

  const invalidFunctions: string[] = [];

  const minifyConfig = setupMinification();

  const walk = async (dir: string) => {
    const files = await readdir(dir);

    await Promise.all(
      files.map(async (file) => {
        const filepath = join(dir, file);
        const isDirectory = (await stat(filepath)).isDirectory();
        const relativePath = relative(functionsDir, filepath);

        if (isDirectory && filepath.endsWith('.func')) {
          const name = relativePath.replace(/\.func$/, '');

          const functionConfigFile = join(filepath, '.vc-config.json');
          let functionConfig: { runtime: 'edge'; entrypoint: string };
          try {
            const contents = await readFile(functionConfigFile, 'utf8');
            functionConfig = JSON.parse(contents);
          } catch {
            invalidFunctions.push(file);
            return;
          }

          if (functionConfig.runtime !== 'edge') {
            invalidFunctions.push(name);
            return;
          }

          const functionFile = join(filepath, functionConfig.entrypoint);
          let functionFileExists = false;
          try {
            await stat(functionFile);
            functionFileExists = true;
          } catch {}

          if (!functionFileExists) {
            invalidFunctions.push(name);
            return;
          }

          let contents = await readFile(functionFile, 'utf8');
          contents = contents.replace(
            // TODO: This hack is not good. We should replace this with something less brittle ASAP
            /(Object.defineProperty\(globalThis,\s*"__import_unsupported",\s*{[\s\S]*?configurable:\s*)([^,}]*)(.*}\s*\))/gm,
            '$1true$3',
          );

          // The workers runtime does not implement certain properties like `mode`, `credentials`, or `integrity`.
          // Due to this, we need to replace them with null so that request deduping cache key generation will work.
          contents = contents.replace(
            /(?:(JSON\.stringify\(\[\w+\.method\S+,)\w+\.mode(,\S+,)\w+\.credentials(,\S+,)\w+\.integrity(\]\)))/gm,
            '$1null$2null$3null$4',
          );

          if (experimentalMinify) {
            // contents = patchContentsForMinify(contents);
            contents = await minify(minifyConfig, contents);
          }

          const newFilePath = join(tmpFunctionsDir, `${relativePath}.js`);
          await mkdir(dirname(newFilePath), { recursive: true });
          await writeFile(newFilePath, contents);

          functionsMap.set(
            normalizePath(
              relative(functionsDir, filepath).slice(0, -'.func'.length),
            ),
            normalizePath(newFilePath),
          );
        } else if (isDirectory) {
          await walk(filepath);
        }
      }),
    );
  };

  await walk(functionsDir);

  await writeMinifiedNodesToDisk(minifyConfig);

  if (functionsMap.size === 0) {
    console.log('⚡️ No functions detected.');
    return;
  }

  let middlewareManifest: MiddlewareManifest;
  try {
    // Annoying that we don't get this from the `.vercel` directory.
    // Maybe we eventually just construct something similar from the `.vercel/output/functions` directory with the same magic filename/precendence rules?
    middlewareManifest = JSON.parse(
      await readFile('.next/server/middleware-manifest.json', 'utf8'),
    );
  } catch {
    console.error('⚡️ ERROR: Could not read the functions manifest.');
    exit(1);
  }

  if (middlewareManifest.version !== 2) {
    console.error(
      `⚡️ ERROR: Unknown functions manifest version. Expected 2 but found ${middlewareManifest.version}.`,
    );
    console.error(
      '⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.',
    );
    exit(1);
  }

  const hydratedMiddleware = new Map<
    string,
    {
      matchers: { regexp: string }[];
      filepath: string;
    }
  >();
  const hydratedFunctions = new Map<
    string,
    {
      matchers: { regexp: string }[];
      filepath: string;
    }
  >();

  const middlewareEntries = Object.values(middlewareManifest.middleware);
  const functionsEntries = Object.values(middlewareManifest.functions);
  for (const [name, filepath] of functionsMap) {
    if (name === 'middleware' && middlewareEntries.length > 0) {
      for (const entry of middlewareEntries) {
        if (entry?.name === 'middleware') {
          hydratedMiddleware.set(name, { matchers: entry.matchers, filepath });
        }
      }
    }

    for (const entry of functionsEntries) {
      if (matchFunctionEntry(entry.name, name)) {
        hydratedFunctions.set(name, { matchers: entry.matchers, filepath });
      }
    }
  }

  const rscFunctions = [...functionsMap.keys()].filter((name) =>
    name.endsWith('.rsc'),
  );

  if (
    hydratedMiddleware.size + hydratedFunctions.size !==
    functionsMap.size - rscFunctions.length
  ) {
    console.error(
      '⚡️ ERROR: Could not map all functions to an entry in the manifest.',
    );
    console.error(
      '⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.',
    );
    exit(1);
  }

  if (invalidFunctions.length > 0) {
    console.error(
      '⚡️ ERROR: Failed to produce a Cloudflare Pages build from the project.',
    );
    console.error(
      '⚡️ The following functions were not configured to run with the Edge Runtime:',
    );
    console.error('⚡️');
    invalidFunctions.map((invalidFunction) => {
      console.error(`⚡️  - ${invalidFunction}`);
    });
    console.error('⚡️');
    console.error('⚡️ If this is a Next.js project:');
    console.error('⚡️');
    console.error(
      '⚡️  - you can read more about configuring Edge API Routes here (https://nextjs.org/docs/api-routes/edge-api-routes),',
    );
    console.error('⚡️');
    console.error(
      '⚡️  - you can try enabling the Edge Runtime for a specific page by exporting the following from your page:',
    );
    console.error('⚡️');
    console.error(
      "⚡️      export const config = { runtime: 'experimental-edge' };",
    );
    console.error('⚡️');
    console.error(
      "⚡️  - or you can try enabling the Edge Runtime for all pages in your project by adding the following to your 'next.config.js' file:",
    );
    console.error('⚡️');
    console.error(
      "⚡️      const nextConfig = { experimental: { runtime: 'experimental-edge'} };",
    );
    console.error('⚡️');
    console.error(
      '⚡️ You can read more about the Edge Runtime here: https://nextjs.org/docs/advanced-features/react-18/switchable-runtime',
    );
    exit(1);
  }

  const functionsFile = join(
    tmpdir(),
    `functions-${Math.random().toString(36).slice(2)}.js`,
  );

  await writeFile(
    functionsFile,
    `
    export const __FUNCTIONS__ = {${[...hydratedFunctions.entries()]
      .map(
        ([name, { matchers, filepath }]) =>
          `"${name}": { matchers: ${JSON.stringify(
            matchers,
          )}, entrypoint: require('${filepath}')}`,
      )
      .join(',')}};
      
      export const __MIDDLEWARE__ = {${[...hydratedMiddleware.entries()]
        .map(
          ([name, { matchers, filepath }]) =>
            `"${name}": { matchers: ${JSON.stringify(
              matchers,
            )}, entrypoint: require('${filepath}')}`,
        )
        .join(',')}};`,
  );

  console.log(functionsFile);

  await build({
    entryPoints: [join(__dirname, '../templates/_worker.js')],
    bundle: true,
    inject: [
      join(__dirname, '../templates/_worker.js/globals.js'),
      functionsFile,
    ],
    target: 'es2021',
    platform: 'neutral',
    define: {
      __CONFIG__: JSON.stringify(config),
      __BASE_PATH__: JSON.stringify(basePath),
    },
    outfile: '.vercel/output/static/_worker.js',
    external: ['node:async_hooks'],
    minify: experimentalMinify,
  });

  const outputSize = (await stat('.vercel/output/static/_worker.js')).size;
  const regularChange = outputSize - 22830243;
  const expiesbChange = outputSize - 3263687;
  const manifesChange = outputSize - 1797653;
  const staticrChange = outputSize - 1727221;
  console.log();
  console.log(`Build is ${outputSize} bytes`);
  console.log(
    `  - change (regular): ${
      regularChange < 0 ? `${regularChange}` : `+${regularChange}`
    } bytes.`,
  );
  console.log(
    `  - change (exp+esb): ${
      expiesbChange < 0 ? `${expiesbChange}` : `+${expiesbChange}`
    } bytes.`,
  );
  console.log(
    `  - change (manifes): ${
      manifesChange < 0 ? `${manifesChange}` : `+${manifesChange}`
    } bytes.`,
  );
  console.log(
    `  - change (staticr): ${
      staticrChange < 0 ? `${staticrChange}` : `+${staticrChange}`
    } bytes.`,
  );
  console.log();

  console.log("⚡️ Generated '.vercel/output/static/_worker.js'.");
};

const help = () => {
  console.log('⚡️');
  console.log('⚡️ Usage: npx @cloudflare/next-on-pages [options]');
  console.log('⚡️');
  console.log('⚡️ Options:');
  console.log('⚡️');
  console.log('⚡️   --help:                Shows this help message');
  console.log('⚡️');
  console.log(
    "⚡️   --skip-build:          Doesn't run 'vercel build' automatically",
  );
  console.log('⚡️');
  console.log(
    '⚡️   --experimental-minify: Attempts to minify the functions of a project (by de-duping webpack chunks)',
  );
  console.log('⚡️');
  console.log(
    '⚡️   --watch:               Automatically rebuilds when the project is edited',
  );
  console.log('⚡️');
  console.log('⚡️');
  console.log('⚡️ GitHub: https://github.com/cloudflare/next-on-pages');
  console.log(
    '⚡️ Docs: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/',
  );
};

const main = async ({
  skipBuild,
  experimentalMinify,
}: {
  skipBuild: boolean;
  experimentalMinify: boolean;
}) => {
  if (!skipBuild) {
    await prepVercel();
    await buildVercel();
  }

  await transform({ experimentalMinify });
};

(async () => {
  console.log('⚡️ @cloudflare/next-on-pages CLI');

  if (process.argv.includes('--help')) {
    help();
    return;
  }

  const skipBuild = process.argv.includes('--skip-build');
  const experimentalMinify = process.argv.includes('--experimental-minify');
  const limit = pLimit(1);

  if (process.argv.includes('--watch')) {
    watch('.', {
      ignored: [
        '.git',
        'node_modules',
        '.vercel',
        '.next',
        'package-lock.json',
        'yarn.lock',
      ],
      ignoreInitial: true,
    }).on('all', () => {
      if (limit.pendingCount === 0) {
        limit(() =>
          main({ skipBuild, experimentalMinify }).then(() => {
            console.log('⚡️');
            console.log(
              "⚡️ Running in '--watch' mode. Awaiting changes... (Ctrl+C to exit.)",
            );
          }),
        );
      }
    });
  }

  limit(() =>
    main({ skipBuild, experimentalMinify }).then(() => {
      if (process.argv.includes('--watch')) {
        console.log('⚡️');
        console.log(
          "⚡️ Running in '--watch' mode. Awaiting changes... (Ctrl+C to exit.)",
        );
      }
    }),
  );
})();
