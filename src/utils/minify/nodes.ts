import { subtle } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import type { Node } from 'acorn';

export type LooseNode = Node & {
  expression?: LooseNode;
  declaration?: LooseNode;
  callee?: LooseNode;
  object?: LooseNode;
  left?: LooseNode;
  right?: LooseNode;
  property?: LooseNode;
  arguments?: LooseNode[];
  elements?: LooseNode[];
  properties?: LooseNode[];
  key?: LooseNode;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
};

export type AST = Node & { body: LooseNode[] };

/**
 * Get the hash of a generated node.
 *
 * @param str String to hash.
 * @returns Hash of the string.
 */
export const generateHash = async (str: string) => {
  const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Create a new temporary directory.
 *
 * @returns Path to a new folder inside the OS's temporary directory.
 */
export const newTmpDir = () =>
  join(tmpdir(), Math.random().toString(36).slice(2));

/**
 * Write a map of generated nodes to the disk.
 *
 * @param dir Directory to write the nodes to.
 * @param nodes A map of identifier to generated code for a node.
 */
export const writeNodesToDisk = async (
  dir: string,
  nodes: Map<number | string, string>,
) => {
  for (const [identifier, code] of nodes) {
    const filePath = join(dir, `${identifier}.js`);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `export default ${code}`);
  }
};

/**
 * Construct a new AST node to access the default export of a file.
 *
 * @param filePath File path to the generated node.
 * @returns A new AST node to require a file and access its default export.
 */
export const constructRequireNode = (filePath: string) => ({
  type: 'MemberExpression',
  object: {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: 'require',
    },
    arguments: [
      {
        type: 'Literal',
        value: filePath,
        raw: JSON.stringify(filePath),
      },
    ],
  },
  property: { type: 'Identifier', name: 'default' },
});
