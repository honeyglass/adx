import type { Kind } from './kind.ts';
import type { Refused } from './refused.ts';
export interface Answer<O> {
    ok: boolean;
    applied?: boolean;
    kind?: Kind;
    state?: string;
    result?: O;
    next?: {
        does: string;
        command?: string;
        needs?: string[];
    }[];
    issues?: {
        code: string;
        path?: string;
        message: string;
        hint: string;
        command?: string;
    }[];
}
export type Exit = 0 | 1 | 2;
export declare function exitOf(answer: Answer<unknown>): Exit;
/**
 * @param refused - the refusal of a call
 * @param issues - its issues as the answer names them, the refusal's own by default
 * @returns the answer of the refusal
 */
export declare function refusalAnswer(refused: Refused, issues?: readonly import("./issue.ts").Issue<string>[]): Answer<never>;
