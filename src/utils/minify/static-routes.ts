import { join } from 'path';
import { generate } from './astring';
import type { AST, LooseNode } from './nodes';
import { constructRequireNode, generateHash } from './nodes';
import type { MinifyConfigItem } from './index';

// Filter the AST to find the static route nodes.
const filterExpressions = (parsedContents: AST) =>
  parsedContents.body
    .filter(
      ({ type, declaration }) =>
        type === 'ExportDefaultDeclaration' &&
        declaration.type === 'CallExpression' &&
        declaration.arguments?.[0]?.type === 'ObjectExpression' &&
        declaration.arguments?.[0]?.properties?.[1]?.key?.value ===
          'staticRoutes',
    )
    .map(
      (node) => node?.declaration?.arguments?.[0]?.properties?.[1],
    ) as LooseNode[];

/**
 * Minify the static routes.
 *
 * @param dir Temporary directory to write the static routes to.
 * @param parsedContents AST tree.
 */
export const minifyStaticRoutes = async (
  { dir, nodes }: MinifyConfigItem,
  parsedContents: AST,
) => {
  const staticRoutesNodes = filterExpressions(parsedContents);

  for (const staticRoutesNode of staticRoutesNodes) {
    const code = generate(staticRoutesNode.value);
    const hash = await generateHash(code);

    if (!nodes.has(hash)) {
      nodes.set(hash, code);
    }

    const newValue = constructRequireNode(join(dir, `${hash}.js`));
    staticRoutesNode.value = newValue;
  }
};
