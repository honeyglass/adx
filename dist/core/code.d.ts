/**
 * A code a tool declares once, with its kind and hint, and raises as issues.
 *
 * Code, code: the declared code, and the function that declares it.
 * factsOf: the name, kind and hint of a code, as `schema` lists them.
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
/** An issue without a message repeats the hint of its code, so one issue tells all three. */
export declare function factsOf(declared: Code): {
    code: string;
    kind: Kind;
    hint: string;
};
