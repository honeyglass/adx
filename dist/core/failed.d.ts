import { Issue } from './issue.ts';
import { Refused } from './refused.ts';
/**
 * @param state - what the failed call left, as whole sentences on one line
 * @param cause - the error, kept whole as the cause
 * @returns the refusal to throw
 * @throws a bug RefusalError when the state holds a line break or another unsafe character
 */
export declare function failed(state: string, cause: unknown): Refused;
/**
 * main() and Command.invoke answer every error through it, so both give the same answer.
 *
 * @param error - any thrown value
 * @returns the answer, and for a bug the error chain as text for stderr
 */
export declare function answerOfError(error: unknown): {
    answer: import("./answer.ts").Answer<never>;
    err: string;
};
/**
 * @param refused - a refusal of adx
 * @param issues - its issues as the answer names them, the refusal's own by default
 * @returns the answer, and for a bug the error chain as text for stderr
 */
export declare function answerOfRefused(refused: Refused, issues?: readonly Issue<string>[]): {
    answer: import("./answer.ts").Answer<never>;
    err: string;
};
/**
 * @param error - any thrown value
 * @param state - what the call left; without it, a refusal's own state
 * @returns the refusal of adx for it, of a kind an answer names
 */
export declare function refusedOf(error: unknown, state?: string): Refused;
