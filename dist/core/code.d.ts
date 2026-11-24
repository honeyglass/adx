/**
 * A code a tool declares once, with its kind and hint, and raises as issues.
 *
 * Code, code: the declared code, and the function that declares it.
 *
 * Nothing is checked when code() is called: a tool declares its codes when its files load.
 *
 * @example const noFormal = code('NO_FORMAL_GREETING', 'fix', 'Greet casually');
 */
import { Issue } from './issue.ts';
import type { Kind } from './kind.ts';
export interface Code {
    at<P extends string>(path: P, message?: string): Issue<P>;
    at<const P extends string>(path: readonly [P, ...(string | number)[]], message?: string): Issue<P>;
    issue(message?: string): Issue<never>;
}
export declare function code(name: string, kind: Kind, hint: string): Code;
