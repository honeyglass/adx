import type { Answer } from '../core/index.ts';
import { Runner } from './runner.ts';
import type { Kind } from './runner.ts';
import type { Empty, Given, In, InvokeOptions, Listing, Obj, Spec, UseGiven } from './types.ts';
declare const builtFor: unique symbol;
declare const realRun: unique symbol;
export interface Entry<G extends Obj> {
    readonly [builtFor]: (global: G) => G;
}
/** @returns the runner of a command, or undefined for a group or any other value */
export declare const runnerOf: (entry: object) => Runner | undefined;
/**
 * `R` is the answer of a real run, which `next` and `after` get. `L` names the fields with a
 * source in `values`, which a step can list.
 */
export declare class Command<I extends Obj, O, G extends Obj = Empty, U = {}, R = O, L extends string = never> implements Entry<G> {
    #private;
    readonly [builtFor]: (global: G) => G;
    readonly [realRun]?: R;
    constructor(kind: Kind, spec: Spec, global: Obj | undefined);
    /** The words that call the command, such as `ticket list`. The tool that lists it sets them. */
    get name(): string;
    /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
    invoke(input: Given<I> & UseGiven<Given<G>, U>, options?: InvokeOptions): Promise<Answer<O>>;
}
export declare class ListCommand<I extends Obj, T extends Obj, G extends Obj = Empty, U = {}, L extends string = never> extends Command<I, Listing<In<T>>, G, U, Listing<In<T>>, L> {
    readonly item: T;
    constructor(spec: Spec & {
        item: T;
    }, global: Obj | undefined);
}
export {};
