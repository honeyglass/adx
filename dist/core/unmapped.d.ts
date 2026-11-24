import type { Issue } from './issue.ts';
/**
 * @param error - any thrown value that is no refusal
 * @returns the issue of the first known error of its chain, or UNKNOWN_ERROR of kind bug
 */
export declare function issueOf(error: unknown): Issue<never>;
