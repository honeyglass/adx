/**
 * The commands of a tool: the three kinds, the global input, the table and one call of a command.
 *
 * read, list, effect, global: the kinds of command, and the input every command shares.
 * Global, Commands: the global input as a value, and the table a tool lists its commands in.
 * Field, GlobalUse: the public types of fields and of the global input.
 * placeAll, declarationIssues, runnersIn, isWord: the words of each command, the setup checked at
 * every call, the commands a table lists, and a key that is one word.
 * route, listed, commandsIn: the command the words of a call name, and a group called alone.
 * Answered, refused: what a command answers, with its terminal form.
 * Form, formOf: --output, the form of the answer every call can force.
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
export { formOf } from './output.ts';
export type { Form } from './output.ts';
export type { Global } from './global.ts';
export { effect, list, read } from './kinds.ts';
export { commandsIn, listed, route } from './route.ts';
export type { Ready, RootOption, Run, Runner, Scene } from './runner.ts';
export { declarationIssues, isWord, placeAll, runnersIn } from './table.ts';
export type { Table } from './table.ts';
export type { Commands, Empty, Field, GlobalUse, InvokeOptions, Obj } from './types.ts';
