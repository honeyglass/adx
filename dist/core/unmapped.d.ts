import type { Issue } from './issue.ts';
/**
 * @param error - any thrown value that is no refusal
 * @param about - what failed, such as the request `GET /apps`, which the message names first
 * @returns the issue of the first known error of its chain, or UNKNOWN_ERROR of kind bug
 */
export declare function issueOf(error: unknown, about?: string): Issue<never>;
