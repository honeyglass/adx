/**
 * The types of commands, as proto/adx/index.d.ts declares them for read, list, effect and global.
 *
 * Obj, Empty, Field, In, Given, All, Maybe: a Zod object, its fields, and what a handler gets.
 * GlobalUse, UseGiven, Fields: how one command takes the global fields.
 * Merged, Either: the answer of the real run of an effect, and of either run.
 * Always, Free: the options adx gives a command, and an input that names none of them.
 * Choice, Source, Values: where the values of a field come from.
 * Page, Listing: one page a list asks for, and what its handler answers.
 * Refuse, ReadSpec, ListSpec, EffectSpec: what read(), list() and effect() take.
 * InvokeOptions: what invoke takes beside the input.
 * Commands: the command table of a tool.
 * Spec: the same three as adx reads them, one shape for every kind.
 *
 * Each declared type keeps its form, so a later part of adx adds a member and changes none.
 *
 * @example const greet = read({ does: 'greets', input, example: { name: 'Ada' }, run });
 */
import type { z } from 'zod';
import type { Issue, Refused, Step } from '../core/index.ts';
import type { Entry } from './command.ts';

export type Obj = z.ZodObject;
export type Empty = z.ZodObject<{}>;
export type Maybe<T> = T | Promise<T>;
// A schema without named fields (the empty global) has no field, not every string.
export type Field<S extends Obj> = string extends keyof z.output<S>
  ? never
  : keyof z.output<S> & string;
type Plain<T> = string extends keyof T ? unknown : T;
export type In<S extends Obj> = Plain<z.output<S>>;
export type Given<S extends Obj> = Plain<z.input<S>>;

/**
 * How one command uses the tool's global fields: all of them as declared (the default),
 * none (`false`, such as `whoami`), or some made optional (`{ project: 'optional' }`).
 */
export type GlobalUse<G extends Obj> = false | { readonly [K in Field<G>]?: 'optional' };
type Use<T, U> = [U] extends [false] ? {} : Omit<T, keyof U> & Partial<Pick<T, keyof U & keyof T>>;
/** What a caller passes: a command with `global: false` refuses the global fields, so passing one does not compile. */
export type UseGiven<T, U> = [U] extends [false] ? { [K in keyof T]?: never } : Use<T, U>;
type GlobalField<G extends Obj, U> = [U] extends [false] ? never : Field<G>;
export type All<I extends Obj, G extends Obj, U> = In<I> & Use<In<G>, U>;
export type Fields<I extends Obj, G extends Obj, U> = Field<I> | GlobalField<G, U>;
type Out<O, I extends Obj, G extends Obj, U> = Maybe<O | Refused<Fields<I, G, U>>>;
/** The answer of a real run: everything `plan` answered, plus what `apply` returns. */
export type Merged<O, A> = [A] extends [void] ? O : O & A;
/** The answer of either run: a dry run lacks what `apply` adds. */
export type Either<O, A> = [A] extends [void] ? O : O & Partial<A>;
/** The options of adx that every command takes. A field of that name would be the same option. */
export type Always = 'json' | 'output' | 'help' | 'dryRun' | 'replace';
/** An input compiles only when no field has the name of an option adx gives the command. */
export type Free<S extends Obj, Taken extends string> = [
  Extract<keyof z.output<S>, Taken>,
] extends [never]
  ? unknown
  : { readonly 'adx gives the command an option of this name': Extract<keyof z.output<S>, Taken> };

export type Choice = { value: string; does?: string };
export type Source<I> = (input: Partial<I>) => Maybe<Choice[]>;
export type Values<S extends Obj, G extends Obj = Empty, K extends Field<S> = Field<S>> = {
  [F in K]?: Source<In<S> & In<G>>;
};

export interface Page {
  readonly cursor: string;
  readonly size: number;
}
export interface Listing<T> {
  items: T[];
  next?: string;
  total?: number;
}

export type Refuse<F extends string> = (...issues: [Issue<F>, ...Issue<F>[]]) => Refused<F>;

// the properties every kind of command shares; `Taken` names the options adx gives the kind
interface Common<I extends Obj, G extends Obj, U, R, Taken extends string, L extends Field<I>> {
  does: string;
  input?: I & Free<I, Taken>;
  example?: Given<I>;
  /** Leave out to take every global field as declared. */
  global?: U;
  values?: Values<I, G, L>;
  check?: (input: All<I, G, U>) => Issue<Fields<I, G, U>>[];
  next?: (out: R, input: All<I, G, U>) => Step[];
}
export interface ReadSpec<
  I extends Obj,
  G extends Obj,
  O,
  U = {},
  S extends z.ZodType = z.ZodType,
  L extends Field<I> = never,
> extends Common<I, G, U, O, Always | (z.ZodType extends S ? never : 'fields'), L> {
  /**
   * The schema of the answer. With it the command takes `--fields`, and `schema` shows the answer.
   * A read that answers a long list or a large document needs it.
   */
  output?: S;
  run: (input: All<I, G, U>, ctx: { refuse: Refuse<Fields<I, G, U>> }) => Out<O, I, G, U>;
  text?: (out: O) => string;
}
export interface ListSpec<
  I extends Obj,
  G extends Obj,
  T extends Obj,
  U = {},
  L extends Field<I> = never,
> extends Common<I, G, U, Listing<In<T>>, Always | 'page' | 'fields', L> {
  item: T;
  key: Field<T>;
  outline: Field<T>[];
  pageSize?: number;
  run: (
    input: All<I, G, U>,
    ctx: { page: Page; refuse: Refuse<Fields<I, G, U>> },
  ) => Out<Listing<In<T>>, I, G, U>;
  text?: (item: In<T>) => string;
}
export interface EffectSpec<
  I extends Obj,
  G extends Obj,
  O,
  A extends object | void,
  U = {},
  L extends Field<I> = never,
> extends Common<I, G, U, Merged<O, A>, Always, L> {
  /** Runs every check. Its answer is the answer of the dry run. */
  plan: (input: All<I, G, U>, ctx: { refuse: Refuse<Fields<I, G, U>> }) => Out<O, I, G, U>;
  /**
   * Only for a send or another effect that is no file. It returns what the real run adds;
   * adx answers `{ ...planned, ...applied }`.
   */
  apply?: (
    input: All<I, G, U>,
    ctx: { planned: O; refuse: Refuse<Fields<I, G, U>> },
  ) => Out<A, I, G, U>;
  text?: (out: Either<O, A>) => string;
}

export interface InvokeOptions {
  dryRun?: boolean;
}

/** The refuse of any handler, as a method, so the refuse of each typed spec fits it. */
type LooseRefuse = { refuse(...issues: [Issue, ...Issue[]]): Refused };

/**
 * A spec of any kind as adx reads it. Its handlers are methods, whose parameters TypeScript
 * compares both ways, so each typed spec of the declared API fits it without a cast; the
 * checks of the input stand before every handler call.
 */
export interface Spec {
  readonly does: string;
  readonly input?: Obj;
  readonly example?: unknown;
  readonly global?: unknown;
  readonly output?: z.ZodType;
  readonly pageSize?: number;
  check?(input: unknown): readonly Issue[];
  run?(input: unknown, ctx: LooseRefuse & { page?: Page }): unknown;
  plan?(input: unknown, ctx: LooseRefuse): unknown;
  apply?(input: unknown, ctx: LooseRefuse & { planned: unknown }): unknown;
  text?(out: unknown): string;
  next?(out: unknown, input: unknown): readonly Step[];
}

/** The command table: a key is one word of the call, and a nested table is a group. */
export interface Commands<G extends Obj> {
  readonly [word: string]: Entry<G> | Commands<G>;
}
