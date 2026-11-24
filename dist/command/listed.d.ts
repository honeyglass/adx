import type { Choice } from '../core/index.ts';
import type { Answered } from './answered.ts';
/**
 * @param option - the option without its dashes, such as home-town
 * @param listed - the values the option takes, or the names already taken
 * @returns the answer, and its text: the option, then the values on one line, each line break
 * in a value escaped
 */
export declare function listedAnswer(option: string, listed: {
    values: readonly Choice[];
} | {
    taken: readonly string[];
}): Answered;
