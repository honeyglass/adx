import type { Choice, Issue, Known, Sourced } from '../core/index.ts';
/** @returns the issues of the values a call gave; none when every value stands in its list */
export declare function outside(command: Sourced, known: Known): Promise<Issue[]>;
/**
 * @param command - the command of the call
 * @param known - the input of the call
 * @returns the issues, and the checked input without a value outside its list
 */
export declare function judged(command: Sourced, known: Known): Promise<{
    issues: Issue<string>[];
    accepted: {
        [k: string]: unknown;
    };
}>;
/**
 * A choice is text, so a number stands in its list by its decimal form, and any other value in
 * none.
 *
 * @param value - one value of a field
 * @param choices - the list of the field's source
 * @returns whether the list holds the value
 */
export declare function isListed(value: unknown, choices: readonly Choice[]): boolean;
