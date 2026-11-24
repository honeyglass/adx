/**
 * The entry of '@honeyglass/adx/node', the adapter to Node: the one folder that imports node:.
 *
 * around, write: what one call gets from Node, and what it leaves there.
 * tokensOf: the arguments of a call as tokens, read by util.parseArgs.
 * captured: what console writes during a call in the process of a test.
 * network: the port a remote reaches its server through.
 * scratch, seeded: the scratch folders of a call of the test kit, and its seed copied in.
 * snapshot, testFolder: what a folder holds, and the top of the test's working directory, so
 * the test kit sees what a call changed.
 * program, serve: a tool run as a program, and a server that answers for a fake of its remote.
 * byteLength: the size of a text in bytes, as stdout carries it.
 * textAt, keep, digestOf: the start of a file's text, a text written whole, and the digest of a
 * text, with which the test kit reads a skill and keeps the fingerprints of the stored kinds.
 *
 * @example const node = await import('../node/index.ts');
 */
export { around } from "./around.js";
export { captured } from "./capture.js";
export { byteLength } from "./bytes.js";
export { digestOf, keep, textAt } from "./kept.js";
export { network } from "./network.js";
export { program } from "./program.js";
export { scratch, seeded } from "./scratch.js";
export { serve } from "./serve.js";
export { snapshot, testFolder } from "./snapshot.js";
export { tokensOf } from "./tokens.js";
export { write } from "./write.js";
