/**
 * The commands of a tool: the three kinds, the global input, the table and one call of a command.
 *
 * read, list, effect, global: the kinds of command, and the input every command shares.
 * Global, Commands: the global input as a value, and the table a tool lists its commands in.
 * Field, GlobalUse: the public types of fields and of the global input.
 * placeAll, declarationIssues: the words of each command, and the setup checked at every call.
 * route, listed: the command the words of a call name, and a group called alone.
 * Answered, refused: what a command answers, with its terminal form.
 *
 * @example import { declarationIssues, route } from '../command/index.ts';
 */
export { refused } from "./answered.js";
export { global } from "./global.js";
export { effect, list, read } from "./kinds.js";
export { listed, route } from "./route.js";
export { declarationIssues, placeAll } from "./table.js";
