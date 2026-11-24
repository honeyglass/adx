import type { Answer, Issue } from '../core/index.ts';
export type Answered = {
    answer: Answer<unknown>;
    text?: (result: unknown) => string;
};
/** @param issues - adx's own issues of one call, at least one */
export declare function refused(issues: readonly [Issue, ...Issue[]]): Answered;
