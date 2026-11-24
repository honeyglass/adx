/**
 * The commands of a tool and how a call gives them their input.
 *
 * read, answererOf: the kind of command that only reads, and the answer of its value for the tool.
 * givenOf: the fields a call gives after its command word.
 *
 * @example import { answererOf, givenOf } from '../command/index.ts';
 */
export { answererOf } from "./command.js";
export { givenOf } from "./given.js";
export { read } from "./read.js";
