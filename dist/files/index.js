/**
 * Roots and files: the folders a tool may use, the paths a call names, and the writes of a plan.
 *
 * envDir, marker, cwd, root, rootOptions: where a root lies, the root, and the option of each.
 * dir, inFile, outFile, id, multiline: the field schemas adx gives.
 * Located, Moved, within, seedFolders: the roots of one call, the call a handler reads in, and
 * the folders the test kit seeds.
 * staging, Replace: the writes of one call, which the tool hands its command.
 * CHANGES_LIMIT, CHANGES_BYTES, NAME_BYTES: the entries of each list of changes, the largest old
 * file a replace reads for them, and the longest name in a path, which `schema` names.
 *
 * @example import { root, envDir, staging } from '../files/index.ts';
 */
export { Located, seedFolders, within } from "./located.js";
export { cwd, envDir, marker, root, rootOptions } from "./roots.js";
export { CHANGES_BYTES, CHANGES_LIMIT, NAME_BYTES } from "./limits.js";
export { dir, id, inFile, multiline, outFile } from "./schemas.js";
export { staging } from "./staging.js";
