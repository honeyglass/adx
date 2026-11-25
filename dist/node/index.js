/**
 * The entry of '@honeyglass/adx/node', the adapter to Node: the one folder that imports node:.
 *
 * around, output, Output: what one call gets from Node, and what the program leaves there.
 * catchLost: the errors of the program that no call awaited.
 * tokensOf: the arguments of a call as tokens, read by util.parseArgs.
 * captured: what console writes during a call in the process of a test.
 * network: the port a remote reaches its server through.
 * scratch, seeded: the scratch folders of a call of the test kit, and its seed copied in.
 * snapshot, testFolder: what a folder holds, and the top of the test's working directory, so
 * the test kit sees what a call changed.
 * program, serve: a tool run as a program, and a server that answers for a fake of its remote.
 * byteLength: the size of a text in bytes, as stdout carries it.
 * skillAt, placeSkill: a skill by its name under a home, and a SKILL.md copied there.
 * textAt, keep, digestOf: the start of a file's text, a text written whole, and the digest of a
 * text, with which the test kit reads a skill and keeps the fingerprints of the stored kinds.
 *
 * @example const node = await import('../node/index.ts');
 */
export { around } from "./around.js";
export { captured } from "./capture.js";
export { byteLength } from "./bytes.js";
export { digestOf, keep, textAt } from "./kept.js";
export { catchLost } from "./lost.js";
export { network } from "./network.js";
export { program } from "./program.js";
export { scratch, seeded } from "./scratch.js";
export { serve } from "./serve.js";
export { placeSkill, skillAt } from "./skills.js";
export { snapshot, testFolder } from "./snapshot.js";
export { tokensOf } from "./tokens.js";
export { output } from "./write.js";
