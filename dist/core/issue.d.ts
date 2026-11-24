/**
 * One issue of a refusal: a code at a field, at a place below it, or at no field.
 *
 * Path: the place of an issue, a field first.
 * Issue, Parts: what a code raises, and what it holds beside its code and path.
 * issueAnswer: the issue as the answer writes it.
 * withCommand, stepOf: the issue with a command, unless it names one of its own, and its step.
 * withHint: the issue with a hint of its own in place of its code's.
 *
 * The parts stay in a table beside the issue, not in private fields: an Issue then has the
 * members proto/adx/index.d.ts declares and no other, so the built type equals the declared one.
 *
 * @example const issue = new Issue('SCHEMA', ['name'], { kind: 'fix', message, hint });
 */
import type { Kind } from './kind.ts';
import type { Step } from './step.ts';
export type Path<P extends string> = readonly [P, ...(string | number)[]];
export type Parts = {
    kind: Kind;
    message: string;
    hint: string;
    step?: Step;
};
export declare class Issue<P extends string = string> {
    readonly code: string;
    /** Absent, not undefined, on an issue at no field, so the answer has no path. */
    readonly path?: Path<P>;
    constructor(code?: string, path?: Path<P>, parts?: Parts);
    command(step: Step): Issue<P>;
}
/**
 * @param issue - an issue of a refusal
 * @returns its code, its path with dots, its message and hint, and the command of its step
 */
export declare function issueAnswer(issue: Issue): {
    command?: string | undefined;
    message: string;
    hint: string;
    path?: string | undefined;
    code: string;
};
/**
 * A command the issue already names, such as the list call of its field, says more than one
 * adx names for every issue, so it stays.
 *
 * @param issue - an issue of a refusal
 * @param step - the step to the command it gets when it names none
 * @returns the issue with a command
 */
export declare const withCommand: (issue: Issue, step: Step) => Issue<string>;
/**
 * For an issue whose next move depends on the call, such as a field to give first.
 *
 * @param issue - an issue of a refusal
 * @param hint - what the agent does next
 * @returns the issue with that hint
 */
export declare const withHint: (issue: Issue, hint: string) => Issue<string>;
/** @returns the step the issue names, which the answer writes out, or undefined */
export declare const stepOf: (issue: Issue) => Step | undefined;
/** The kind of the code that raised the issue. */
export declare const kindOfIssue: (issue: Issue) => Kind;
