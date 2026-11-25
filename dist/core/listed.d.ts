import type { Scope } from './types.ts';
/**
 * @param scope - the store of the call's surroundings
 * @param tool - the name of the tool and the kinds it lists
 * @param work - the call, which reads stored texts
 * @returns what the work answers; its error is thrown as it came
 */
export declare const listing: <T>(scope: Scope, tool: {
    name: string;
    stored: readonly object[];
}, work: () => Promise<T>) => Promise<T>;
/**
 * @param kind - the stored kind a handler uses
 * @param use - what the handler does with it, for the message
 * @returns a DECLARATION refusal for a kind the running call's tool does not list, else undefined
 */
export declare function unlisted(kind: {
    name: string;
}, use: 'reads' | 'writes'): import("./refused.ts").Refused<never> | undefined;
