/**
 * A refusal of adx: a RefusalError that carries the issues of the answer.
 *
 * Refused: the error a refusal throws or a handler returns.
 * refusedWith: the refusal of adx's own issues, such as an unknown command.
 * NOTHING_CHANGED, UNKNOWN_STATE: a call refused before it changed anything, and one whose
 * changes nobody knows.
 *
 * @example return refusalAnswer(refusedWith([schema.at('name')], NOTHING_CHANGED));
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { kindOfIssue } from "./issue.js";
export const NOTHING_CHANGED = 'Nothing was changed.';
/** What an error left when nobody said: adx cannot know what the call changed before it. */
export const UNKNOWN_STATE = 'The call stopped at an error; what it changed before is not known.';
export class Refused extends RefusalError {
    issues;
    constructor(r, issues = []) {
        super(r);
        this.issues = issues;
    }
}
/**
 * @param issues - the issues of one call, at least one
 * @param state - what the call left, as whole sentences
 * @param cause - the error that led to the refusal, kept whole
 * @returns the refusal, of the kind of its first issue
 */
export function refusedWith(issues, state, cause) {
    const codes = issues.map(issue => issue.code).join(', ');
    const refusal = {
        kind: kindOfIssue(issues[0]),
        step: 'adx',
        reason: `the call was refused with ${codes}`,
        next: 'read the issues of the answer',
        state,
        cause,
    };
    return new Refused(refusal, issues);
}
