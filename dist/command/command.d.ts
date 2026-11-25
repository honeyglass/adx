import { builtFor, realRun } from '../core/index.ts';
import type { Answer, Command, CommandStep, Listing, ListCommand } from '../core/index.ts';
import { Runner } from './runner.ts';
import type { Kind } from './runner.ts';
import type { All, Empty, Given, In, InvokeOptions, Obj, Shared, Spec, UseGiven } from './types.ts';
export type { Command, ListCommand } from '../core/index.ts';
export interface Entry<G extends Obj> {
    readonly [builtFor]: (global: G) => G;
}
/** @returns the runner of a command, or undefined for a group or any other value */
export declare const runnerOf: (entry: object) => Runner | undefined;
/** The value read() and effect() make; its runner stays in the table beside it. */
export declare class CommandValue<I extends Obj, O, G extends Obj = Empty, U = {}, R = O, L extends string = never> implements Command<I, O, G, U, R, L> {
    #private;
    readonly [builtFor]: (global: G) => G;
    readonly [realRun]?: R;
    constructor(kind: Kind, spec: Spec, global: Shared | undefined);
    /** The words that call the command, such as `ticket list`. The tool that lists it sets them. */
    get name(): string;
    /** A field the step gives a value is not one it can list, so `.lists` of it does not compile. */
    step<K extends keyof (Given<I> & UseGiven<Given<G>, U>) = never>(input?: Pick<Partial<Given<I> & UseGiven<Given<G>, U>>, K>): CommandStep<Given<I> & UseGiven<Given<G>, U>, Exclude<L, K>>;
    /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
    invoke(input: Given<I> & UseGiven<Given<G>, U>, options?: InvokeOptions): Promise<Answer<O>>;
}
/** Any command, whatever it takes and answers, as index.d.ts declares it. */
export type AnyCommand = Command<any, any, any, any, any>;
/** The answer of the real run of a command, which `next` and `after` get. */
export type RealOf<C> = C extends Command<any, any, any, any, infer R> ? R : never;
/** The input the handler of a command gets, with the global fields it takes. */
export type InputOf<C> = C extends Command<infer I, any, infer G, infer U, any> ? All<I, G, U> : never;
/** The global input a command was made for. */
export type GlobalOf<C> = C extends Entry<infer G extends Obj> ? G : never;
export declare class ListValue<I extends Obj, T extends Obj, G extends Obj = Empty, U = {}, L extends string = never> extends CommandValue<I, Listing<In<T>>, G, U, Listing<In<T>>, L> implements ListCommand<I, T, G, U, L> {
    readonly item: T;
    constructor(spec: Spec & {
        item: T;
    }, global: Shared | undefined);
}
