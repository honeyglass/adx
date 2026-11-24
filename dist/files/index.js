/**
 * Roots and files: the folders a tool may use, the paths a call names, and the writes of a plan.
 *
 * envDir, marker, cwd, root, rootOptions: where a root lies, the root, and the option of each.
 * dir, inFile, outFile, id, multiline: the field schemas adx gives.
 * Located, Moved, within, seedFolders: the roots of one call, the call a handler reads in, and
 * the folders the test kit seeds.
 * staging, Replace: the writes of one call, which the tool hands its command.
 *
 * @example import { root, envDir, staging } from '../files/index.ts';
 */
export { Located, seedFolders, within } from "./located.js";
export { cwd, envDir, marker, root, rootOptions } from "./roots.js";
export { dir, id, inFile, multiline, outFile } from "./schemas.js";
export { staging } from "./staging.js";
