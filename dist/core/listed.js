/**
 * The stored kinds of the call that runs, so a kind its tool does not list is refused when used.
 *
 * listing: runs the work of a call with the kinds its tool lists in `stored`.
 * unlisted: the refusal of a kind the tool of the running call does not list.
 *
 * Which kinds a handler reads or writes shows only when it does, so a read or a write inside a
 * call of a kind its tool does not list is the tool's bug (decision 37). Outside any call, such
 * as a test that calls `parse`, there is no tool, so nothing is refused there.
 *
 * @example const refusal = unlisted(Friend, 'reads'); if (refusal !== undefined) throw refusal;
 */
import { entered, valueOf } from "./call.js";
import { declaration } from "./codes.js";
import { NOTHING_CHANGED, refusedWith } from "./refused.js";
/** The kinds one call's tool lists, which every read of a stored text in that call checks. */
class Listed {
    tool;
    kinds;
    constructor(tool, kinds) {
        this.tool = tool;
        this.kinds = kinds;
    }
}
/**
 * @param scope - the store of the call's surroundings
 * @param tool - the name of the tool and the kinds it lists
 * @param work - the call, which reads stored texts
 * @returns what the work answers; its error is thrown as it came
 */
export const listing = (scope, tool, work) => entered(scope, Listed, new Listed(tool.name, tool.stored), work);
/**
 * @param kind - the stored kind a handler uses
 * @param use - what the handler does with it, for the message
 * @returns a DECLARATION refusal for a kind the running call's tool does not list, else undefined
 */
export function unlisted(kind, use) {
    const listed = valueOf(Listed);
    if (listed instanceof Listed && listed.kinds.includes(kind) === false) {
        const message = `${listed.tool} ${use} the stored kind ${kind.name}, and does not list it in stored`;
        return refusedWith([declaration.issue(message)], NOTHING_CHANGED);
    }
    return undefined;
}
