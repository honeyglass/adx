/**
 * A command as a value, as proto/adx/index.d.ts declares it, so every feature can name one.
 *
 * Obj, Empty, In, Given, Use, UseGiven: a Zod object, the empty one, what a handler gets and a
 * caller writes of it, and how one command takes the global fields.
 * InvokeOptions: what invoke takes beside the input.
 * Command, ListCommand, AnyList: a command and a list as values, and any list, as keyOf takes it.
 * builtFor, realRun: their brands, real symbols, so command/ names them as keys of its class.
 *
 * @example export const keyOf = (list: AnyList) => made(list, 'key');
 */
import type { z } from 'zod';
import type { Answer } from './answer.ts';
import type { Listing } from './listing.ts';
import type { Fake } from './remote.ts';
import type { CommandStep } from './step.ts';
export declare const builtFor: unique symbol;
export declare const realRun: unique symbol;
export type Obj = z.ZodObject;
export type Empty = z.ZodObject<{}>;
type Plain<T> = string extends keyof T ? unknown : T;
export type In<S extends Obj> = Plain<z.output<S>>;
export type Given<S extends Obj> = Plain<z.input<S>>;
export type Use<T, U> = [U] extends [false] ? {} : Omit<T, keyof U> & Partial<Pick<T, keyof U & keyof T>>;
/** What a caller passes: a command with `global: false` refuses the global fields, so passing one does not compile. */
export type UseGiven<T, U> = [U] extends [false] ? {
    [K in keyof T]?: never;
} : Use<T, U>;
export interface InvokeOptions {
    env?: Record<string, string>;
    fakes?: Fake[];
    seed?: string;
    dryRun?: boolean;
    replace?: boolean;
}
/**
 * `R` is the answer of a real run, which `next` and `after` get. `L` names the fields with a
 * source in `values`, which a step can list.
 */
export interface Command<I extends Obj, O, G extends Obj = Empty, U = {}, R = O, L extends string = never> {
    /** Only the global input the command was built for counts in the command table. */
    readonly [builtFor]: (global: G) => G;
    /** The words that call the command, such as `ticket list`. The tool that lists it sets them. */
    readonly name: string;
    readonly [realRun]?: R;
    /** A field the step gives a value is not one it can list, so `.lists` of it does not compile. */
    step<K extends keyof (Given<I> & UseGiven<Given<G>, U>) = never>(input?: Pick<Partial<Given<I> & UseGiven<Given<G>, U>>, K>): CommandStep<Given<I> & UseGiven<Given<G>, U>, Exclude<L, K>>;
    invoke(input: Given<I> & UseGiven<Given<G>, U>, options?: InvokeOptions): Promise<Answer<O>>;
}
export interface ListCommand<I extends Obj, T extends Obj, G extends Obj = Empty, U = {}, L extends string = never> extends Command<I, Listing<In<T>>, G, U, Listing<In<T>>, L> {
    readonly item: T;
}
/** Any list, whatever it takes and lists, as index.d.ts declares the list keyOf takes. */
export type AnyList = ListCommand<any, any, any, any>;
export {};
