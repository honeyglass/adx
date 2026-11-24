import type { Answered, Runner } from '../command/index.ts';
import type { Token } from '../core/index.ts';
import type { Shell } from './tool.ts';
/** @returns whether the first word of the call is `schema` */
export declare const namesSchema: (tokens: readonly Token[]) => boolean;
/**
 * @param shell - what the call reads of the tool
 * @param tokens - every token of the call
 * @returns the answer of `schema`, or the refusal of an option or of a name it does not know
 */
export declare function schemaAnswer(shell: Shell, tokens: readonly Token[]): Answered;
/**
 * Where a shape and a group share a word, the word names the shape (decision 72).
 *
 * @param shell - what the call reads of the tool
 * @param name - a shape, or a command by its words, such as `profile set`
 * @returns the shape or the command, or undefined for a name `schema` does not know
 */
export declare function schemaTargetOf(shell: Shell, name: string): {
    shape: import("zod").ZodType<unknown, unknown, import("zod/v4/core").$ZodTypeInternals<unknown, unknown>>;
    runner?: undefined;
} | {
    runner: Runner;
    shape?: undefined;
} | undefined;
