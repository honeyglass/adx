// Type-only prototype of the public API of adx v2. No implementation.
import type { z } from 'zod';
import { RefusalError } from '@honeyglass/utils/ts';

type Obj = z.ZodObject;
type Empty = z.ZodObject<{}>;
type Maybe<T> = T | Promise<T>;
export type Kind = 'fix' | 'retry' | 'ask' | 'bug';
// A schema without named fields (the empty global) has no field, not every string.
export type Field<S extends Obj> = string extends keyof z.output<S> ? never : keyof z.output<S> & string;
type Plain<T> = string extends keyof T ? unknown : T;
type In<S extends Obj> = Plain<z.output<S>>;
type Given<S extends Obj> = Plain<z.input<S>>;

// steps
export interface Step {
  readonly does: string;
  readonly command?: string;
}
export interface CommandStep<I> extends Step {
  /** Only for an optional field the step still needs; required fields are derived. */
  needs(...fields: (keyof I & string)[]): CommandStep<I>;
}
/** A step for the person: it has a `does` and no command. */
export function tell(does: string): Step;

// codes and refusals
export class Issue<P extends string = string> {
  readonly code: string;
  /** The field the issue stands at. An issue from `code.issue()` has none. */
  readonly path?: P;
  /** Adds a command the agent can run as the next move. */
  command(step: Step): Issue<P>;
}
export class Refused<P extends string = string> extends RefusalError {
  readonly issues: readonly Issue<P>[];
}
export interface Code {
  /** An issue at one field of the input. */
  at<P extends string>(path: P, message?: string): Issue<P>;
  /** An issue that concerns no field, such as a server in maintenance. It has no `path`. */
  issue(message?: string): Issue<never>;
}
export function code(name: string, kind: Kind, hint: string): Code;
/** For an effect that is no file and no request: `state` says what the failed call left. */
export function failed(state: string, cause: unknown): Refused;
/** The HTTP status of a failed send, to map it yourself. A read maps a status with `on`. */
export function status(error: unknown): number | undefined;
type Refuse<F extends string> = (...issues: [Issue<F>, ...Issue<F>[]]) => Refused<F>;

// sources: everything that says where a field's values come from stands in `values`
export type Choice = { value: string; does?: string };
declare const needsBrand: unique symbol;
export interface Needs<K extends string> {
  readonly [needsBrand]: K;
}
/**
 * Returned by a source that cannot answer before other fields are known.
 * Name every field that is surely missing at this point; adx refuses with one issue per field.
 */
export function needs<K extends string>(...fields: [K, ...K[]]): Needs<K>;
export type Source<I> = (input: Partial<I>) => Maybe<Choice[] | Needs<keyof I & string>>;
declare const freshBrand: unique symbol;
export interface Fresh<I> {
  readonly [freshBrand]: (input: Partial<I>) => Maybe<string[]>;
}
/** For a new name: answers the names already taken. It refuses nothing. */
export function fresh<I>(taken: (input: Partial<I>) => Maybe<string[]>): Fresh<I>;
declare const refBrand: unique symbol;
export interface ListRef {
  readonly [refBrand]: 'key' | 'detail';
}
type AnyList = ListCommand<any, any, any, any>;
/** The field takes a key of that list. */
export function keyOf(list: AnyList): ListRef;
/** The same, and this command is the one that shows one item of the list in full. */
export function detailOf(list: AnyList): ListRef;
export type Values<S extends Obj, G extends Obj = Empty> = {
  [K in Field<S>]?: Source<In<S> & In<G>> | Fresh<In<S> & In<G>> | ListRef;
};

// stored data: one kind of file the tool keeps, with the number of its format
export interface Stored<T, Oldest = T> {
  readonly name: string;
  readonly version: number;
  /**
   * Declares one older format and the step to the format after it. Name the formats from the
   * newest down, so `up` answers what the call before it takes.
   */
  from<S extends z.ZodType>(version: number, shape: S, up: (old: z.output<S>) => Oldest): Stored<T, z.output<S>>;
  /** The JSON text of one item, with `"version"` set to the current number. */
  stringify(value: T): string;
  /** Reads the JSON text of one item; an older format is converted, a newer one is refused. */
  parse(text: string): T;
}
/** The format number counts the stored fields of this kind, not the release of the tool. */
export function stored<S extends z.ZodType>(name: string, version: number, shape: S): Stored<z.output<S>>;

// roots and files
export interface File {
  readonly rel: string;
  readonly exists: boolean;
  text(limit: number): Promise<string>;
  bytes(limit: number): Promise<Uint8Array>;
  /** Reads a file of a stored kind; an older format is converted in memory, a newer one is refused. */
  json<T>(limit: number, shape: Stored<T, any>): Promise<T>;
  json<S extends z.ZodType>(limit: number, shape: S): Promise<z.output<S>>;
}
export interface Dir {
  readonly rel: string;
  walk(suffix?: string): AsyncIterable<File>;
}
export interface Root {
  readonly name: string;
  file(rel: string): File;
  list(folder: string, suffix: string): Promise<(File & { stem: string })[]>;
}
export interface RootSource {}
/**
 * A folder the person can move with a variable. Without a location, the folder is `~/.<tool name>`,
 * such as `~/.hello`; a second argument sets a location of its own.
 */
export function envDir(variable: string, location?: string): RootSource;
export function marker(file: string): RootSource;
export const cwd: RootSource;
/**
 * A root from `envDir` also takes an option named after the root, such as `--home`, which wins
 * over the variable. The option cannot be switched off.
 */
export function root(name: string, from: RootSource): Root;
export function dir(root: Root): z.ZodType<Dir, string>;
export function inFile(root: Root): z.ZodType<File, string>;
export function outFile(root: Root): z.ZodType<File, string>;
export function id(): z.ZodString;
/** A string that may hold line breaks. */
export function multiline(): z.ZodString;

// remotes
export interface Request {
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}
type Path = readonly (string | number)[];
type Query = Record<string, string | number | undefined>;
/** Maps a status to the value `get` answers for it, such as `{ 404: undefined }`. */
type On = { readonly [status: number]: unknown };
export interface Remote {
  /**
   * Reads, and checks the answer against the schema. A status named in `on` answers the value
   * given there, so `{ on: { 404: undefined } }` answers `T | undefined`.
   */
  get<S extends z.ZodType, const O extends On = {}>(
    path: Path,
    answer: S,
    options?: { query?: Query; on?: O },
  ): Promise<z.output<S> | O[keyof O]>;
  post(path: Path, body: unknown): Request;
  put(path: Path, body: unknown): Request;
  patch(path: Path, body: unknown): Request;
  delete(path: Path): Request;
}
export interface Auth {}
export function bearer(variable: string): Auth;
export function envUrl(variable: string, fallback: string): string;
export function remote(name: string, at: { url: string; auth?: Auth }): Remote;

// lists
export interface Page {
  readonly cursor: string;
  readonly size: number;
}
export interface Listing<T> {
  items: T[];
  next?: string;
  total?: number;
}
export function paged<T>(all: readonly T[], page: Page): Listing<T>;

// answers
export interface Answer<O> {
  ok: boolean;
  applied?: boolean;
  kind?: Kind;
  state?: string;
  result?: O;
  next?: { does: string; command?: string; needs?: string[] }[];
  issues?: { code: string; path?: string; message: string; hint: string; command?: string }[];
}
export interface Fake {
  readonly remote: Remote;
}
export interface InvokeOptions {
  env?: Record<string, string>;
  fakes?: Fake[];
  seed?: string;
  dryRun?: boolean;
  replace?: boolean;
}

// what a handler gets beside its input
/** What a replacement changes: JSON paths when both contents are JSON, else lines; at most 20 per list. */
export interface Changes {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
  /** How many entries the cap of 20 per list left out. */
  readonly more: number;
}
export interface Written {
  readonly file: string;
  readonly bytes: number;
  readonly replaces: boolean;
  /** Present when the file replaces one. */
  readonly changes?: Changes;
}
/** Both stage one file; adx writes all staged files after `plan` returns, never on a dry run. */
export interface Files {
  /**
   * For a command that creates something new. An existing file is refused unless the call says
   * `--replace`. A new file gets the mode `0600`, or the `mode` given; a replaced file keeps its mode.
   */
  write(file: File, data: string | Uint8Array, options?: { mode?: number }): Written;
  /**
   * For a command whose purpose is to change a file. adx reads the file, up to the limit, and
   * calls `change` with its text. It takes no `--replace`; a missing file is refused.
   */
  update(file: File, limit: number, change: (old: string) => string): Promise<Written>;
}
/** Only `apply` gets it, and adx never calls `apply` on a dry run. Files are staged in `plan`. */
export interface Act {
  send<S extends z.ZodType>(label: string, request: Request, answer: S): Promise<z.output<S>>;
}
/**
 * How one command uses the tool's global fields: all of them as declared (the default),
 * none (`false`, such as `whoami`), or some made optional (`{ project: 'optional' }`).
 */
export type GlobalUse<G extends Obj> = false | { readonly [K in Field<G>]?: 'optional' };
type Use<T, U> = [U] extends [false] ? {} : Omit<T, keyof U> & Partial<Pick<T, keyof U & keyof T>>;
/** What a caller passes: a command with `global: false` refuses the global fields, so passing one does not compile. */
type UseGiven<T, U> = [U] extends [false] ? { [K in keyof T]?: never } : Use<T, U>;
type GlobalField<G extends Obj, U> = [U] extends [false] ? never : Field<G>;
type All<I extends Obj, G extends Obj, U> = In<I> & Use<In<G>, U>;
type Fields<I extends Obj, G extends Obj, U> = Field<I> | GlobalField<G, U>;
type Out<O, I extends Obj, G extends Obj, U> = Maybe<O | Refused<Fields<I, G, U>>>;
/** The answer of a real run: everything `plan` answered, plus what `apply` returns. */
type Merged<O, A> = [A] extends [void] ? O : O & A;
/** The answer of either run: a dry run lacks what `apply` adds. */
type Either<O, A> = [A] extends [void] ? O : O & Partial<A>;

export interface Command<I extends Obj, O, G extends Obj = Empty, U = {}> {
  readonly name: string;
  step(input?: Partial<Given<I> & UseGiven<Given<G>, U>>): CommandStep<Given<I> & UseGiven<Given<G>, U>>;
  invoke(input: Given<I> & UseGiven<Given<G>, U>, options?: InvokeOptions): Promise<Answer<O>>;
}
export interface ListCommand<I extends Obj, T extends Obj, G extends Obj = Empty, U = {}>
  extends Command<I, Listing<In<T>>, G, U> {
  readonly item: T;
}

// the properties every kind of command shares
interface Common<I extends Obj, G extends Obj, U, R> {
  name: string;
  does: string;
  input?: I;
  example?: Given<I>;
  /** Leave out to take every global field as declared. */
  global?: U;
  values?: Values<I, G>;
  check?: (input: All<I, G, U>) => Issue<Fields<I, G, U>>[];
  next?: (out: R, input: All<I, G, U>) => Step[];
}
export interface ReadSpec<I extends Obj, G extends Obj, O, U = {}, S extends z.ZodType = z.ZodType>
  extends Common<I, G, U, O> {
  /**
   * The schema of the answer. With it the command takes `--fields`, and `schema` shows the answer.
   * A read that answers a long list or a large document needs it.
   */
  output?: S;
  run: (input: All<I, G, U>, ctx: { refuse: Refuse<Fields<I, G, U>> }) => Out<O, I, G, U>;
  text?: (out: O) => string;
}
export interface ListSpec<I extends Obj, G extends Obj, T extends Obj, U = {}> extends Common<I, G, U, Listing<In<T>>> {
  item: T;
  key: Field<T>;
  outline: Field<T>[];
  pageSize?: number;
  run: (input: All<I, G, U>, ctx: { page: Page; refuse: Refuse<Fields<I, G, U>> }) => Out<Listing<In<T>>, I, G, U>;
  text?: (item: In<T>) => string;
}
export interface EffectSpec<I extends Obj, G extends Obj, O, A extends object | void, U = {}>
  extends Common<I, G, U, Merged<O, A>> {
  /** Every effect takes `--replace`. `false` switches the option off, and `schema` does not list it. */
  replace?: false;
  /** Runs every check and stages every file. Its answer is the answer of the dry run. */
  plan: (input: All<I, G, U>, ctx: { files: Files; refuse: Refuse<Fields<I, G, U>> }) => Out<O, I, G, U>;
  /**
   * Only for a send or another effect that is no file. It returns what the real run adds;
   * adx answers `{ ...planned, ...applied }`.
   */
  apply?: (input: All<I, G, U>, ctx: { act: Act; planned: O; refuse: Refuse<Fields<I, G, U>> }) => Out<A, I, G, U>;
  /** The call that shows whether a send took effect. adx refuses to start when `apply` stands without it. */
  look?: (input: All<I, G, U>) => Step;
  text?: (out: Either<O, A>) => string;
}

export interface Tool<G extends Obj> {
  /** With `output`, `run` must answer what the schema declares. */
  read<
    I extends Obj = Empty,
    S extends z.ZodType = z.ZodType,
    O extends z.output<S> = z.output<S>,
    const U extends GlobalUse<G> = {},
  >(
    spec: ReadSpec<I, G, O, U, S>,
  ): Command<I, O, G, U>;
  list<I extends Obj = Empty, T extends Obj = Empty, const U extends GlobalUse<G> = {}>(
    spec: ListSpec<I, G, T, U>,
  ): ListCommand<I, T, G, U>;
  effect<I extends Obj = Empty, O = unknown, A extends object | void = void, const U extends GlobalUse<G> = {}>(
    spec: EffectSpec<I, G, O, A, U>,
  ): Command<I, Either<O, A>, G, U>;
  /** The first steps of the start answer (the tool called alone); called after the commands exist. */
  start(steps: () => Maybe<Step[]>): void;
  main(): Promise<void>;
}
export interface ToolSpec<G extends Obj> {
  name: string;
  version: string;
  does: string;
  /**
   * The path of the agent skill, relative to the folder of the tool's package.json. The tool never
   * opens the file; the start answer shows the path, and the test kit checks that it is a skill.
   */
  skill?: string;
  roots?: Root[];
  remotes?: Remote[];
  /** Every kind of data the tool keeps, so `schema` shows its format number and the test kit checks it. */
  stored?: Stored<any, any>[];
  global?: { input: G; example: Given<G>; values?: Values<G, G> };
}
export function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool<G>;
