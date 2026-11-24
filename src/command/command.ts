/**
 * A command as a value: what read(), list() and effect() return, and a tool lists in its table.
 *
 * Entry: a command as the command table sees it; only the global input it was made for counts.
 * Command, ListCommand: the value, with the words that call it, its steps and invoke.
 * AnyCommand, RealOf, InputOf, GlobalOf: any command, and what its real run answers and takes.
 * runnerOf: the runner behind a value of the table, for the tool; undefined for a group.
 *
 * A command carries only the members proto/adx/index.d.ts declares; what runs a call stays in a
 * table beside it, so the tool reaches it and an author does not.
 *
 * @example const answer = await greet.invoke({ name: 'Ada' });
 */
import { $try } from '@honeyglass/utils/ts';
import { answerOfError, commandStep } from '../core/index.ts';
import type { Answer, CommandStep } from '../core/index.ts';
import { Runner } from './runner.ts';
import type { Kind } from './runner.ts';
import type {
  All,
  Empty,
  Given,
  In,
  InvokeOptions,
  Listing,
  Obj,
  Shared,
  Spec,
  UseGiven,
} from './types.ts';

declare const builtFor: unique symbol;
declare const realRun: unique symbol;

export interface Entry<G extends Obj> {
  readonly [builtFor]: (global: G) => G;
}

const runners = new WeakMap<object, Runner>();

/** @returns the runner of a command, or undefined for a group or any other value */
export const runnerOf = (entry: object) => runners.get(entry);

/**
 * `R` is the answer of a real run, which `next` and `after` get. `L` names the fields with a
 * source in `values`, which a step can list.
 */
export class Command<
  I extends Obj,
  O,
  G extends Obj = Empty,
  U = {},
  R = O,
  L extends string = never,
> implements Entry<G> {
  declare readonly [builtFor]: (global: G) => G;
  declare readonly [realRun]?: R;
  readonly #runner: Runner;

  constructor(kind: Kind, spec: Spec, global: Shared | undefined) {
    this.#runner = new Runner(kind, spec, global);
    runners.set(this, this.#runner);
  }

  /** The words that call the command, such as `ticket list`. The tool that lists it sets them. */
  get name() {
    return this.#runner.name;
  }

  /** A field the step gives a value is not one it can list, so `.lists` of it does not compile. */
  step<K extends keyof (Given<I> & UseGiven<Given<G>, U>) = never>(
    input?: Pick<Partial<Given<I> & UseGiven<Given<G>, U>>, K>,
  ): CommandStep<Given<I> & UseGiven<Given<G>, U>, Exclude<L, K>> {
    return commandStep(this.#runner, { ...input });
  }

  /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
  invoke(input: Given<I> & UseGiven<Given<G>, U>, options?: InvokeOptions): Promise<Answer<O>>;
  async invoke(input: unknown, options: InvokeOptions = {}): Promise<Answer<unknown>> {
    const run = {
      dryRun: options.dryRun ?? false,
      fields: undefined,
      lists: undefined,
      replace: options.replace ?? false,
      folders: {},
    };
    const scene = { env: options.env, seed: options.seed };
    const { data, error } = await $try(() => this.#runner.through(input, run, scene));
    return error === null ? data.answer : answerOfError(error).answer;
  }
}

/**
 * Any command, whatever it takes and answers: only a command carries the brand of the global
 * input it was made for, and every brand fits a function of never.
 */
export type AnyCommand = { readonly [builtFor]: (global: never) => unknown };
/** The answer of the real run of a command, which `next` and `after` get. */
export type RealOf<C> = C extends { readonly [realRun]?: infer R } ? R : never;
/** The input the handler of a command gets, with the global fields it takes. */
export type InputOf<C> =
  C extends Command<infer I, infer _O, infer G, infer U, infer _R, infer _L> ? All<I, G, U> : never;
/** The global input a command was made for. */
export type GlobalOf<C> = C extends Entry<infer G extends Obj> ? G : never;

export class ListCommand<
  I extends Obj,
  T extends Obj,
  G extends Obj = Empty,
  U = {},
  L extends string = never,
> extends Command<I, Listing<In<T>>, G, U, Listing<In<T>>, L> {
  readonly item: T;

  constructor(spec: Spec & { item: T }, global: Shared | undefined) {
    super('list', spec, global);
    this.item = spec.item;
  }
}
