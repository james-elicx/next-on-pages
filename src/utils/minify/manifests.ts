import { join } from 'path';
import { generate } from './astring';
import type { AST, LooseNode } from './nodes';
import { constructRequireNode, generateHash } from './nodes';
import type { MinifyConfigItem } from './index';

const identifiers = [
  '__RSC_SERVER_MANIFEST',
  '__RSC_MANIFEST',
  '__RSC_CSS_MANIFEST',
  '__BUILD_MANIFEST',
  '__REACT_LOADABLE_MANIFEST',
  '__FONT_LOADER_MANIFEST',
];

// Filter the AST to find the manifest nodes.
const filterExpressions = (parsedContents: AST) =>
  parsedContents.body
    .filter(
      ({ type, expression }) =>
        type === 'ExpressionStatement' &&
        expression?.type === 'AssignmentExpression' &&
        expression.left?.type === 'MemberExpression' &&
        expression.left.object?.name === 'self' &&
        expression.left.property?.type === 'Identifier' &&
        expression.left.property.name &&
        identifiers.includes(expression.left.property.name) &&
        expression.right?.type === 'ObjectExpression',
    )
    .map((node) => node?.expression) as LooseNode[];

/**
 * Minify the manifests.
 *
 * @param dir Temporary directory to write the manifests to.
 * @param parsedContents AST tree.
 */
export const minifyManifests = async (
  { dir, nodes }: MinifyConfigItem,
  parsedContents: AST,
) => {
  const manifests = filterExpressions(parsedContents);

  for (const manifestNode of manifests) {
    const code = generate(manifestNode.right);
    const hash = await generateHash(code);

    if (code.length > 3) {
      if (!nodes.has(hash)) {
        nodes.set(hash, code);
      }

      const newValue = constructRequireNode(join(dir, `${hash}.js`));
      manifestNode.right = newValue as unknown as LooseNode;
    }
  }
};
