/**
 * A refusal of adx: a RefusalError that carries the issues of the answer.
 *
 * Refused: the error a refusal throws or a handler returns.
 * refusedWith: the refusal of adx's own issues, such as an unknown command.
 * NOTHING_CHANGED, UNKNOWN_STATE: a call refused before it changed anything, and one whose
 * changes nobody knows.
 * withLook, lookOf: the step that shows what `apply` left, kept beside a refusal out of it.
 *
 * @example return refusalAnswer(refusedWith([schema.at('name')], NOTHING_CHANGED));
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import type { Issue } from './issue.ts';
import type { Step } from './step.ts';
export declare const NOTHING_CHANGED = "Nothing was changed.";
/** What an error left when nobody said: adx cannot know what the call changed before it. */
export declare const UNKNOWN_STATE = "The call stopped at an error; what it changed before is not known.";
export declare class Refused<P extends string = string> extends RefusalError {
    readonly issues: readonly Issue<P>[];
    constructor(r: Refusal, issues?: readonly Issue<P>[]);
}
/**
 * @param issues - the issues of one call, at least one
 * @param state - what the call left, as whole sentences
 * @param cause - the error that led to the refusal, kept whole
 * @returns the refusal, of the kind of its first issue
 */
export declare function refusedWith<P extends string>(issues: readonly [Issue<P>, ...Issue<P>[]], state: string, cause?: unknown): Refused<P>;
/**
 * The tool names the look only when a request of the call may have taken effect, which only it
 * knows, so the runner keeps the step beside the refusal and changes none of its issues.
 *
 * @param error - a refusal out of `apply`
 * @param step - the look of the command, for the input of the call
 */
export declare const withLook: (error: object, step: Step) => undefined;
/** @returns the look kept beside a refusal, or undefined */
export declare const lookOf: (error: unknown) => Step | undefined;
