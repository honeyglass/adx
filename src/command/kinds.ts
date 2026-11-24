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
import type {
  EffectSpec,
  Either,
  Empty,
  Field,
  GlobalUse,
  ListSpec,
  Merged,
  Obj,
  ReadSpec,
} from './types.ts';

/**
 * Each kind is a property, not a method, so `const { read } = project` keeps its global input.
 */
export class Kinds<G extends Obj> {
  readonly #global: G | undefined;

  constructor(global: G | undefined) {
    this.#global = global;
  }

  /** With `output`, `run` must answer what the schema declares. */
  readonly read = <
    I extends Obj = Empty,
    S extends z.ZodType = z.ZodType,
    O extends z.output<S> = z.output<S>,
    const U extends GlobalUse<G> = {},
    L extends Field<I> = never,
  >(
    spec: ReadSpec<I, G, O, U, S, L>,
  ) => new Command<I, O, G, U, O, L>('read', spec, this.#global);

  readonly list = <
    I extends Obj = Empty,
    T extends Obj = Empty,
    const U extends GlobalUse<G> = {},
    L extends Field<I> = never,
  >(
    spec: ListSpec<I, G, T, U, L>,
  ) => new ListCommand<I, T, G, U, L>(spec, this.#global);

  readonly effect = <
    I extends Obj = Empty,
    O = unknown,
    A extends object | void = void,
    const U extends GlobalUse<G> = {},
    L extends Field<I> = never,
  >(
    spec: EffectSpec<I, G, O, A, U, L>,
  ) => new Command<I, Either<O, A>, G, U, Merged<O, A>, L>('effect', spec, this.#global);
}

const plain = new Kinds<Empty>(undefined);

/** For a tool without global input. A tool with one takes the three from its `global(...)`. */
export const read = plain.read;
export const list = plain.list;
export const effect = plain.effect;
