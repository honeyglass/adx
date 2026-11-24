/**
 * The answer of --help: what a command takes, made from its declaration, as facts and as text.
 *
 * AdxOption, Help: an option adx gives a command, with what it does, and what help reads.
 * helpOf: the facts, and the text a person at a terminal reads.
 * helpFacts: the facts alone, which `schema <command>` shows too.
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
export type Help = {
    /** The words of the call, the tool's name first. */
    command: string;
    does: string;
    fields: readonly FieldOf[];
    options: readonly AdxOption[];
    example: unknown;
};
export declare function helpOf(help: Help): Answered;
export declare function helpFacts(help: Help): {
    example?: {} | null | undefined;
    command: string;
    does: string;
    fields: {
        repeats?: boolean | undefined;
        default?: {} | null | undefined;
        required?: boolean | undefined;
        does?: string | undefined;
        takes: Takes;
        option?: string | undefined;
        field: string;
    }[];
    options: readonly AdxOption[];
};
