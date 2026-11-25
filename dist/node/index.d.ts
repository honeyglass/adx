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
export { around } from './around.ts';
export { captured } from './capture.ts';
export { byteLength } from './bytes.ts';
export { digestOf, keep, textAt } from './kept.ts';
export { catchLost } from './lost.ts';
export { network } from './network.ts';
export { program } from './program.ts';
export type { ProgramCall } from './program.ts';
export { scratch, seeded } from './scratch.ts';
export { serve } from './serve.ts';
export { placeSkill, skillAt } from './skills.ts';
export { snapshot, testFolder } from './snapshot.ts';
export { tokensOf } from './tokens.ts';
export { output } from './write.ts';
export type { Output } from './write.ts';
