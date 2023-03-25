import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse } from 'acorn';
import { generate } from './astring';
import { minifyManifests } from './manifests';
import type { AST } from './nodes';
import { writeNodesToDisk, newTmpDir } from './nodes';
import { minifyStaticRoutes } from './static-routes';
import { minifyWebpackChunks } from './webpack-chunks';

// TODO: Investigate alternatives or a real fix for this.
/**
 * This is a hack to fix an issue with --experimental-minify where the compiled
 * next/server/web/adapter.ts throws the following error:
 *
 * `Unhandled Promise Rejection: TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))`
 *
 * @param contents Code to patch.
 * @returns Patched code.
 */
export const patchContentsForMinify = (contents: string) =>
  contents.replace(
    /(?:(return{response:\w+,waitUntil:Promise\.all\(\w+\[\w+\])(\)}))/gm,
    '$1??[]$2',
  );

export type MinifyConfigItem = {
  dir: string;
  nodes: Map<number | string, string>;
};
export type MinifyConfig = Record<
  'webpack' | 'manifests' | 'staticRoutes',
  MinifyConfigItem
>;

/**
 * Create the temporary directories and maps used in minification.
 *
 * @returns Temporary directories and maps.
 */
export const setupMinification = (): MinifyConfig => {
  const dir = newTmpDir();

  return {
    webpack: {
      dir: join(dir, 'webpack'),
      nodes: new Map<number, string>(),
    },
    manifests: {
      dir: join(dir, 'manifests'),
      nodes: new Map<string, string>(),
    },
    staticRoutes: {
      dir: join(dir, 'static-routes'),
      nodes: new Map<string, string>(),
    },
  };
};

/**
 * Minify the inputted source code.
 *
 * @param dir Temporary directory to write files to.
 * @param contents Code to minify.
 * @returns Minified code.
 */
export const minify = async (config: MinifyConfig, contents: string) => {
  // parse the source code to an AST tree.
  const parsedContents = parse(contents, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  }) as AST;

  // run minification on the AST tree.
  await minifyWebpackChunks(config.webpack, parsedContents);
  await minifyManifests(config.manifests, parsedContents);
  await minifyStaticRoutes(config.staticRoutes, parsedContents);

  // generate the minified code from the AST tree.
  return generate(parsedContents);
};

/**
 * Write the minified nodes to the disk.
 *
 * @param config Temporary directories and maps.
 */
export const writeMinifiedNodesToDisk = async (config: MinifyConfig) =>
  Promise.all(
    Object.values(config).map(({ dir, nodes }) => writeNodesToDisk(dir, nodes)),
  );
