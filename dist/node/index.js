/**
 * The entry of '@honeyglass/adx/node', the adapter to Node: the one folder that imports node:.
 *
 * around, write: what one call gets from Node, and what it leaves there.
 * captured: what console writes during a call in the process of a test.
 *
 * @example const node = await import('../node/index.ts');
 */
export { around } from "./around.js";
export { captured } from "./capture.js";
export { write } from "./write.js";
