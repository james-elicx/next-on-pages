import { writeFileSync } from 'fs';
import { join } from 'path';
import { exit } from 'process';
import { generate } from './astring';
import { constructRequireNode } from './nodes';
import type { AST, LooseNode } from './nodes';
import type { MinifyConfigItem } from './index';

// Filter the AST to find the webpack chunks.
const filterExpressions = (parsedContents: AST) =>
  parsedContents.body
    .filter(
      ({ type, expression }) =>
        type === 'ExpressionStatement' &&
        expression?.type === 'CallExpression' &&
        expression.callee?.type === 'MemberExpression' &&
        expression.callee.object?.type === 'AssignmentExpression' &&
        expression.callee.object.left?.object?.name === 'self' &&
        expression.callee.object.left.property?.name === 'webpackChunk_N_E' &&
        expression.arguments?.[0]?.elements?.[1]?.type === 'ObjectExpression',
    )
    .map(
      (node) => node?.expression?.arguments?.[0]?.elements?.[1]?.properties,
    ) as LooseNode[][];

/**
 * Minify the webpack chunks.
 *
 * @param dir Temporary directory to write the webpack chunks to.
 * @param parsedContents AST tree.
 */
export const minifyWebpackChunks = async (
  { dir, nodes }: MinifyConfigItem,
  parsedContents: AST,
) => {
  const expressions = filterExpressions(parsedContents);

  for (const objectOfChunks of expressions) {
    for (const chunkExpression of objectOfChunks) {
      const key = chunkExpression?.key?.value;
      if (key in nodes) {
        if (nodes.get(key) !== generate(chunkExpression.value)) {
          console.error(
            "⚡️ ERROR: Detected a collision with '--experimental-minify'.",
          );
          console.error(
            "⚡️ Try removing the '--experimental-minify' argument.",
          );
          console.error(
            '⚡️ Please report this at https://github.com/cloudflare/next-on-pages/issues.',
          );
          exit(1);
        }
      }

      // if (
      //   generate(chunkExpression.value).includes('class p') &&
      //   generate(chunkExpression.value).includes('waitUntil')
      // ) {
      //   const test = generate(chunkExpression.value);
      //   if (
      //     test.includes(
      //       `Symbol("response"), d = Symbol("passThrough"), c = Symbol("waitUntil")`,
      //     )
      //   ) {
      //     // writeFileSync(`C:/Users/user/Dev/dump2.json`, test);
      //   }
      // }

      nodes.set(key, generate(chunkExpression.value));
      // if (
      //   generate(chunkExpression.value).includes(
      //     `Symbol("response"), d = Symbol("passThrough"), c = Symbol("waitUntil")`,
      //   )
      // ) {
      //   writeFileSync(`C:/Users/user/Dev/dump2.json`, nodes.get(key));
      //   for (const [identifier, code] of nodes) {
      //     const filePath = join(dir, `${identifier}.js`);

      //     writeFileSync(
      //       `C:/Users/user/Dev/dump3.json`,
      //       `export default ${code}`,
      //     );
      //   }
      // }

      const newValue = constructRequireNode(join(dir, `${key}.js`));
      chunkExpression.value = newValue;
    }
  }
};
