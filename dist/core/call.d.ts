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
import type { Scope } from './types.ts';
/**
 * @param scope - the store of the call's surroundings
 * @param key - the key the feature reads its value by
 * @param value - the value of this call
 * @param work - the call, which reads the value
 * @returns what the work answers; its error is thrown as it came
 */
export declare function entered<T>(scope: Scope, key: object, value: unknown, work: () => Promise<T>): Promise<T>;
/** @returns the value under the key in the call that runs, or undefined */
export declare const valueOf: (key: object) => unknown;
/**
 * @param work - the part of a call that answers a refusal
 * @returns what the work answers, while every remote of the call is blocked
 */
export declare const refusing: <T>(work: () => Promise<T>) => Promise<T>;
export declare const isRefusing: () => boolean;
/** A request that the block held back; the source that asked for it cannot tell its answer. */
export declare class Held extends RefusalError {
    constructor();
}
export declare const isHeld: (error: unknown) => error is Held;
