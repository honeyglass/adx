/**
 * The input every command of a tool shares, such as `--project`.
 *
 * Global, global: the shared input, and the three kinds with it typed into every handler and
 * its sources known to every command.
 * Shares: the value global() makes.
 *
 * With global() the input is declared before the commands, so a command knows its type without
 * importing the tool; the tool takes the same value as its `global`.
 *
 * @example const { read } = global({ input: z.object({ project: id() }), example: { project: 'web' } });
 */
import { Makers } from './kinds.ts';
import type { Kinds } from './kinds.ts';
import type { Fresh, Source } from '../core/index.ts';
import type { Always, Field, Free, Given, In, Obj, Shared } from './types.ts';
export interface Global<G extends Obj> extends Kinds<G> {
    readonly input: G;
}
export declare class Shares<G extends Obj> extends Makers<G> implements Global<G> {
    readonly input: G;
    constructor(input: G, values: Shared['values'], example: Shared['example']);
}
/** A global field goes to every kind of command, so it takes no name of an option of any kind. */
export declare function global<G extends Obj>(spec: {
    input: G & Free<G, Always | 'page' | 'fields'>;
    example: Given<G>;
    /**
     * Every source but `keyOf` and `detailOf`: a list is made before the global input, so no tool
     * with one lists it.
     */
    values?: {
        [F in Field<G>]?: Source<In<G>> | Fresh<In<G>>;
    };
}): Global<G>;
