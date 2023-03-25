export { normalizePath } from './paths';
export {
  minify,
  patchContentsForMinify,
  setupMinification,
  writeMinifiedNodesToDisk,
} from './minify';
export { newTmpDir } from './minify/nodes';
export { matchFunctionEntry } from './transform';
