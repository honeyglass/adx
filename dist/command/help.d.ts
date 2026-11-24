/**
 * The answer of --help: what a command takes, made from its declaration, as facts and as text.
 *
 * AdxOption: an option adx gives a command, with what it does.
 * helpOf: the facts, and the text a person at a terminal reads.
 *
 * There is no help text to write: the words, `does`, the fields with their `.describe()`, the
 * options of adx and the example all come from the command.
 *
 * @example return helpOf({ command: 'hello greet', does, fields, options, example });
 */
import type { Answered } from './answered.ts';
import type { FieldOf, Takes } from './input.ts';
export type AdxOption = {
    option: string;
    takes: Takes;
    does: string;
};
type Help = {
    /** The words of the call, the tool's name first. */
    command: string;
    does: string;
    fields: readonly FieldOf[];
    options: readonly AdxOption[];
    example: unknown;
};
export declare function helpOf(help: Help): Answered;
export {};
