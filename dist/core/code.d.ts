/**
 * A code a tool declares once, with its kind and hint, and raises as issues.
 *
 * Code, code: the declared code, and the function that declares it.
 * factsOf: the name, kind and hint of a code, as `schema` lists them.
 * codesMade: every code code() made in the process, in the order it made them.
 *
 * Nothing is checked when code() is called: a tool declares its codes when its files load. Each
 * code() also registers its code in the one registry of the process, so `schema` lists codes a
 * tool never raised (decision 87). A code is a value of the tool's files and knows no tool, so a
 * test with two tools in one process lists the codes of both in each.
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
export declare const codesMade: () => readonly Code[];
/** An issue without a message repeats the hint of its code, so one issue tells all three. */
export declare function factsOf(declared: Code): {
    code: string;
    kind: Kind;
    hint: string;
};
