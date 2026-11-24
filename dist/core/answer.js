/**
 * The answer every call writes, and the exit code it ends with.
 *
 * Answer: the answer as proto/adx/index.d.ts declares it.
 * Exit, exitOf: 0 for a success, 1 for a refusal of kind fix, ask or retry, 2 for kind bug.
 * refusalAnswer: the answer of a refusal, issues only, since next belongs to a success; a
 * refusal without a state, such as failed('', error), states that its changes are not known.
 *
 * @example const exit = exitOf(refusalAnswer(refusedOf(error)));
 */
import { readRefusal } from '@honeyglass/utils/ts';
import { issueAnswer } from "./issue.js";
import { kindOf } from "./kind.js";
import { UNKNOWN_STATE } from "./refused.js";
export function exitOf(answer) {
    if (answer.ok)
        return 0;
    return answer.kind === 'bug' ? 2 : 1;
}
export function refusalAnswer(refused) {
    return {
        ok: false,
        kind: kindOf(refused.kind),
        state: readRefusal(refused.message)?.state ?? UNKNOWN_STATE,
        issues: refused.issues.map(issueAnswer),
    };
}
