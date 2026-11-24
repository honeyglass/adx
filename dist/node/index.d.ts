/**
 * The entry of '@honeyglass/adx/node', the adapter to Node: the one folder that imports node:.
 *
 * around, write: what one call gets from Node, and what it leaves there.
 * tokensOf: the arguments of a call as tokens, read by util.parseArgs.
 * captured: what console writes during a call in the process of a test.
 * network: the port a remote reaches its server through.
 * scratch, seeded: the scratch folders of a call of the test kit, and its seed copied in.
 *
 * @example const node = await import('../node/index.ts');
 */
export { around } from './around.ts';
export { captured } from './capture.ts';
export { network } from './network.ts';
export { scratch, seeded } from './scratch.ts';
export { tokensOf } from './tokens.ts';
export { write } from './write.ts';
