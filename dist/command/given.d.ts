import type { Issue } from '../core/index.ts';
/**
 * @param words - the arguments after the command word
 * @returns each option with its value, and the issues of the words that fit no pair
 */
export declare function givenOf(words: readonly string[]): {
    given: {
        [k: string]: string;
    };
    issues: Issue<string>[];
};
