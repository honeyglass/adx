/**
 * The three kinds of command: read, list and effect, for a tool with or without global input.
 *
 * Kinds: the three, made for one global input or none.
 * read, list, effect: the three for a tool without global input.
 *
 * A command is a value: it runs once a tool lists it in `commands`. Nothing is checked when it
 * is made, since a tool makes its commands when its files load; the call checks them.
 *
 * @example const greet = read({ does: 'greets', input, example: { name: 'Ada' }, run });
 */
import type { z } from 'zod';
import { Command, ListCommand } from './command.ts';
import type { EffectSpec, Either, Empty, Field, GlobalUse, ListSpec, Merged, Obj, ReadSpec, Shared } from './types.ts';
/**
 * Each kind is a property, not a method, so `const { read } = project` keeps its global input.
 */
export declare class Kinds<G extends Obj> {
    #private;
    constructor(global: Shared | undefined);
    /** With `output`, `run` must answer what the schema declares. */
    readonly read: <I extends Obj = Empty, S extends z.ZodType = z.ZodType, O extends z.output<S> = z.output<S>, const U extends GlobalUse<G> = {}, L extends Field<I> = never>(spec: ReadSpec<I, G, O, U, S, L>) => Command<I, O, G, U, O, L>;
    readonly list: <I extends Obj = Empty, T extends Obj = Empty, const U extends GlobalUse<G> = {}, L extends Field<I> = never>(spec: ListSpec<I, G, T, U, L>) => ListCommand<I, T, G, U, L>;
    readonly effect: <I extends Obj = Empty, O = unknown, A extends object | void = void, const U extends GlobalUse<G> = {}, L extends Field<I> = never>(spec: EffectSpec<I, G, O, A, U, L>) => Command<I, Either<O, A>, G, U, Merged<O, A>, L>;
}
/** For a tool without global input. A tool with one takes the three from its `global(...)`. */
export declare const read: <I extends Obj = Empty, S extends z.ZodType = z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>, O extends z.core.output<S> = z.core.output<S>, const U extends GlobalUse<Empty> = {}, L extends Field<I> = never>(spec: ReadSpec<I, Empty, O, U, S, L>) => Command<I, O, Empty, U, O, L>;
export declare const list: <I extends Obj = Empty, T extends Obj = Empty, const U extends GlobalUse<Empty> = {}, L extends Field<I> = never>(spec: ListSpec<I, Empty, T, U, L>) => ListCommand<I, T, Empty, U, L>;
export declare const effect: <I extends Obj = Empty, O = unknown, A extends object | void = void, const U extends GlobalUse<Empty> = {}, L extends Field<I> = never>(spec: EffectSpec<I, Empty, O, A, U, L>) => Command<I, Either<O, A>, Empty, U, Merged<O, A>, L>;
