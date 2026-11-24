/**
 * The commands of a tool: the three kinds, the global input, the table and one call of a command.
 *
 * read, list, effect, global: the kinds of command, and the input every command shares.
 * Global, Commands: the global input as a value, and the table a tool lists its commands in.
 * Field, GlobalUse: the public types of fields and of the global input.
 * placeAll, declarationIssues, runnersIn: the words of each command, the setup checked at every
 * call, and the commands a table lists.
 * route, listed, commandsIn: the command the words of a call name, and a group called alone.
 * Answered, refused: what a command answers, with its terminal form.
 * Runner, runnerOf, Ready, Run: what runs a command, the call ready for its handler, and its run.
 * After, after, followsOf: the steps after a command, given at the tool.
 *
 * @example import { declarationIssues, route } from '../command/index.ts';
 */
export type { After } from './after.ts';
export { after, followsOf } from './after.ts';
export { refused } from './answered.ts';
export type { Answered } from './answered.ts';
export { runnerOf } from './command.ts';
export { global } from './global.ts';
export type { Global } from './global.ts';
export { effect, list, read } from './kinds.ts';
export { commandsIn, listed, route } from './route.ts';
export type { Ready, Run, Runner } from './runner.ts';
export { declarationIssues, placeAll, runnersIn } from './table.ts';
export type { Table } from './table.ts';
export type { Commands, Empty, Field, GlobalUse, Obj } from './types.ts';
