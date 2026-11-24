/**
 * Any error as a refusal of adx, and as the answer a call gives for it.
 *
 * refusedOf: the refusal for any error, sorted as the guide's "Errors you did not map" says.
 * failed: the same for an author's effect that is no file and no request.
 * answerOfError: the answer of an error, and what stderr gets for a bug.
 *
 * A refusal of adx keeps its issues. A RefusalError keeps its kind, and its reason and next
 * become the message and hint of one UNKNOWN_ERROR issue. Any other error gets the issue that
 * unmapped.ts finds for it, which is UNKNOWN_ERROR of kind bug for an error adx does not know.
 *
 * @example throw failed('The migration ran up to step 3.', error);
 */
import { causeText, readRefusal, RefusalError } from '@honeyglass/utils/ts';
import { refusalAnswer } from "./answer.js";
import { Issue } from "./issue.js";
import { kindOf } from "./kind.js";
import { Refused, refusedWith, UNKNOWN_STATE } from "./refused.js";
import { issueOf } from "./unmapped.js";
/**
 * @param state - what the failed call left, as whole sentences on one line
 * @param cause - the error, kept whole as the cause
 * @returns the refusal to throw
 * @throws a bug RefusalError when the state holds a line break or another unsafe character
 */
export function failed(state, cause) {
    return refusedOf(cause, state);
}
/**
 * main() and Command.invoke answer every error through it, so both give the same answer.
 *
 * @param error - any thrown value
 * @returns the answer, and for a bug the error chain as text for stderr
 */
export function answerOfError(error) {
    const refused = refusedOf(error);
    const err = refused.kind === 'bug' ? `${causeText(refused)}\n` : '';
    return { answer: refusalAnswer(refused), err };
}
/**
 * @param error - any thrown value
 * @param state - what the call left; without it, a refusal's own state
 * @returns the refusal of adx for it, of a kind an answer names
 */
export function refusedOf(error, state) {
    if (error instanceof Refused && error.issues.length > 0)
        return restated(error, state);
    if (error instanceof RefusalError)
        return foreign(error, state);
    return refusedWith([issueOf(error)], state ?? UNKNOWN_STATE, error);
}
function restated(refused, state) {
    if (state === undefined && refused.kind !== 'blocked')
        return refused;
    const r = readRefusal(refused.message);
    if (r === undefined)
        return refusedWith([issueOf(refused)], state ?? UNKNOWN_STATE, refused);
    const refusal = { ...r, kind: kindOf(r.kind), state: state ?? r.state, cause: refused };
    return new Refused(refusal, refused.issues);
}
function foreign(error, state) {
    const r = readRefusal(error.message);
    if (r === undefined)
        return refusedWith([issueOf(error)], state ?? UNKNOWN_STATE, error);
    const kind = kindOf(r.kind);
    const issue = new Issue('UNKNOWN_ERROR', undefined, { kind, message: r.reason, hint: r.next });
    const refusal = { ...r, kind, state: state ?? r.state ?? UNKNOWN_STATE, cause: error };
    return new Refused(refusal, [issue]);
}
