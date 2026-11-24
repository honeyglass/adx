/**
 * The values of the call that runs, which a feature reads without a call at hand.
 *
 * entered, valueOf: runs work of a call with a value under a key, and the value of the call now.
 * refusing, isRefusing, Held, isHeld: runs work while a refusal is answered, whether that is so
 * now, and the refusal of a request held back meanwhile (decision 79).
 *
 * A handler reads a file or a server through a value it imported, such as home.file(...) or
 * api.get(...), with no call at hand, so each call keeps its values in the store of its
 * surroundings, which survives its awaits: two calls at once, such as two run() of a test, each
 * read their own. A block lasts for the work it wraps only, so a request outside it goes out.
 *
 * @example return entered(call.scope, Located, call, work);
 */
import { RefusalError } from '@honeyglass/utils/ts';
/** The store of the calls, which every call hands in; one per process. */
let calls;
/**
 * @param scope - the store of the call's surroundings
 * @param key - the key the feature reads its value by
 * @param value - the value of this call
 * @param work - the call, which reads the value
 * @returns what the work answers; its error is thrown as it came
 */
export function entered(scope, key, value, work) {
    calls = scope;
    return scope.run(key, value, work);
}
/** @returns the value under the key in the call that runs, or undefined */
export const valueOf = (key) => calls?.get(key);
const REFUSING = {};
/**
 * @param work - the part of a call that answers a refusal
 * @returns what the work answers, while every remote of the call is blocked
 */
export const refusing = (work) => calls === undefined ? work() : calls.run(REFUSING, true, work);
export const isRefusing = () => valueOf(REFUSING) === true;
/** A request that the block held back; the source that asked for it cannot tell its answer. */
export class Held extends RefusalError {
    constructor() {
        super({
            kind: 'retry',
            step: 'remote',
            reason: 'a request was held back, since adx sends none while it answers a refusal',
            next: 'call the command again once the refusal is fixed',
        });
    }
}
export const isHeld = (error) => error instanceof Held;
