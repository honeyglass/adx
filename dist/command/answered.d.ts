import type { Answer, Issue } from '../core/index.ts';
/**
 * `ran` is set on a success of a command: its whole result, and the input its handler got.
 * `err` is what stderr gets, the error chain of a refusal of kind bug.
 */
export type Answered = {
    answer: Answer<unknown>;
    text?: (result: unknown) => string;
    ran?: {
        result: unknown;
        input: unknown;
    };
    err?: string;
};
/** @param issues - adx's own issues of one call, at least one */
export declare function refused(issues: readonly [Issue, ...Issue[]]): Answered;
