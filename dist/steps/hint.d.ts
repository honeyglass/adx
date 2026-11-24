/**
 * The command that helps with a code, given where the tool is put together.
 *
 * Hint, hint: the command for every issue of one code, for a command its folder does not import.
 * hintFor: the step of the hint for a code, by the name an issue carries.
 * codeOf: the name of the code a hint stands for, so the tool finds two hints for one code.
 *
 * The function gets nothing, so adx can call it without a call. Nothing is checked when hint()
 * is called, since a tool makes its hints when its files load.
 *
 * @example hint(frozen, () => envs.step()),
 */
import type { Code, CommandStep, Step } from '../core/index.ts';
declare const helps: unique symbol;
export interface Hint {
    readonly [helps]: Code;
}
/**
 * @param code - a code the tool declared with code()
 * @param step - the step to the command that helps; a step from tell has no command
 * @returns the hint, which the tool takes in `hints`
 */
export declare function hint(code: Code, step: () => CommandStep<never>): Hint;
/** @returns the name of the code the hint stands for, or undefined for any other value */
export declare const codeOf: (made: Hint) => string | undefined;
/**
 * @param hints - the hints of the tool, at most one per code, as the start checks
 * @param code - the code of an issue
 * @returns the step of the hint for the code, or undefined when none stands for it
 */
export declare function hintFor(hints: readonly Hint[], code: string): Step | undefined;
export {};
