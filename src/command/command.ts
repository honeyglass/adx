/**
 * A command as a value: what read(), list() and effect() return, and a tool lists in its table.
 *
 * Entry: a command as the command table sees it; only the global input it was made for counts.
 * Command, ListCommand: the types of core/, passed on.
 * CommandValue, ListValue: the value, with the words that call it, its steps and invoke.
 * AnyCommand, RealOf, InputOf, GlobalOf: any command, and what its real run answers and takes.
 * runnerOf: the runner behind a value of the table, for the tool; undefined for a group.
 *
 * A command carries only the members proto/adx/index.d.ts declares; what runs a call stays in a
 * table beside it, so the tool reaches it and an author does not. Its type is the interface of
 * core/, as declared, so a type of the class, such as its private runner, never shows in the API.
 *
 * @example const answer = await greet.invoke({ name: 'Ada' });
 */
import { $try } from '@honeyglass/utils/ts';
import { answerOfError, builtFor, commandStep, realRun } from '../core/index.ts';
import type { Answer, Command, CommandStep, Listing, ListCommand } from '../core/index.ts';
import { Runner } from './runner.ts';
import type { Kind } from './runner.ts';
import type { All, Empty, Given, In, InvokeOptions, Obj, Shared, Spec, UseGiven } from './types.ts';

export type { Command, ListCommand } from '../core/index.ts';

export interface Entry<G extends Obj> {
  readonly [builtFor]: (global: G) => G;
}

const runners = new WeakMap<object, Runner>();

/** @returns the runner of a command, or undefined for a group or any other value */
export const runnerOf = (entry: object) => runners.get(entry);

/** The value read() and effect() make; its runner stays in the table beside it. */
export class CommandValue<
  I extends Obj,
  O,
  G extends Obj = Empty,
  U = {},
  R = O,
  L extends string = never,
> implements Command<I, O, G, U, R, L> {
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
      page: undefined,
      replace: options.replace ?? false,
      folders: {},
    };
    const scene = { env: options.env, seed: options.seed, fakes: options.fakes };
    const { data, error } = await $try(() => this.#runner.through(input, run, scene));
    return error === null ? data.answer : answerOfError(error).answer;
  }
}

/** Any command, whatever it takes and answers, as index.d.ts declares it. */
export type AnyCommand = Command<any, any, any, any, any>;
/** The answer of the real run of a command, which `next` and `after` get. */
export type RealOf<C> = C extends Command<any, any, any, any, infer R> ? R : never;
/** The input the handler of a command gets, with the global fields it takes. */
export type InputOf<C> =
  C extends Command<infer I, any, infer G, infer U, any> ? All<I, G, U> : never;
/** The global input a command was made for. */
export type GlobalOf<C> = C extends Entry<infer G extends Obj> ? G : never;

export class ListValue<
  I extends Obj,
  T extends Obj,
  G extends Obj = Empty,
  U = {},
  L extends string = never,
>
  extends CommandValue<I, Listing<In<T>>, G, U, Listing<In<T>>, L>
  implements ListCommand<I, T, G, U, L>
{
  readonly item: T;

  constructor(spec: Spec & { item: T }, global: Shared | undefined) {
    super('list', spec, global);
    this.item = spec.item;
  }
}
