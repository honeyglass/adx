/**
 * The tool: its commands put together, and main(), which runs one call.
 *
 * Tool, ToolSpec, Shell, tool: the tool, what tool() takes, what a call reads of it, and tool().
 * specOf: the spec of a tool that tool() made, for the test kit, which gets only the tool.
 *
 * Nothing is checked when tool() is called: a tool is built when its file loads, and a check
 * belongs in main() or the call. tool() only gives each command the words that call it, the
 * way the tool answers a call of it, so invoke answers as the tool prints, the sources of its
 * fields, the roots of the tool, whose options every command takes, and the send of `apply`. A shape is kept as
 * given: `schema` reads it, and a SCHEMA issue finds it by its value.
 *
 * @example export const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet } });
 */
import { placeAll } from '../command/index.ts';
import type { After, Commands, Empty, Global, Obj, Table } from '../command/index.ts';
import type { Remote, Root, Step, Stored } from '../core/index.ts';
import { rootOptions } from '../files/index.ts';
import { act } from '../remote/index.ts';
import type { Shapes } from '../shapes/index.ts';
import type { Hint } from '../steps/index.ts';
import { sources } from '../values/index.ts';
import { main } from './main.ts';
import { invoked } from './through.ts';

export interface Tool {
  /**
   * Runs one call. It is the outermost function: a refusal that reaches it is answered by its
   * kind, and any other error once, here, as a bug with exit code 2. It never rejects.
   */
  main(): Promise<void>;
}

type Maybe<T> = T | Promise<T>;

export interface ToolSpec<G extends Obj> {
  name: string;
  version: string;
  does: string;
  roots?: Root[];
  remotes?: Remote[];
  /** Every kind of data the tool keeps, so `schema` shows its format number and the test kit checks it. */
  stored?: Stored<unknown, never>[];
  /** Leave out for a tool whose commands share no input. */
  global?: Global<G>;
  /** Every command of the tool. A command built for another global input does not compile here. */
  commands: Commands<NoInfer<G>>;
  /**
   * Schemas a caller writes and no command takes whole, each under the word that names it.
   * `schema` lists the names, `schema <name>` prints one, and a `SCHEMA` issue inside one names
   * that call.
   */
  shapes?: Shapes;
  /** Steps `after` a command, for the steps that cross folders. */
  next?: After<NoInfer<G>>[];
  /** The command of a `hint` for a code, for the hints that cross folders. */
  hints?: Hint[];
  /** The first steps of the start answer (the tool called alone). */
  start?: () => Maybe<Step[]>;
}

/** What one call reads of a tool. */
export type Shell = {
  readonly name: string;
  readonly version: string;
  readonly does: string;
  readonly commands: Table;
  readonly roots: readonly Root[];
  readonly remotes: readonly Remote[];
  readonly stored: readonly Stored<unknown, never>[];
  readonly shapes: Shapes;
  readonly next: readonly object[];
  readonly hints: readonly Hint[];
  readonly start: (() => Maybe<readonly Step[]>) | undefined;
};

/** A tool knows its spec; the table lets run() of the test kit find it from the tool alone. */
const specs = new WeakMap<object, Shell>();

export function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool {
  const shell: Shell = {
    name: spec.name,
    version: spec.version,
    does: spec.does,
    commands: spec.commands,
    roots: spec.roots ?? [],
    remotes: spec.remotes ?? [],
    stored: spec.stored ?? [],
    shapes: spec.shapes ?? {},
    next: spec.next ?? [],
    hints: spec.hints ?? [],
    start: spec.start,
  };
  const roots = rootOptions(shell.roots);
  placeAll(shell.commands, {
    name: shell.name,
    through: call => invoked(shell, call),
    sources,
    roots,
    act,
  });
  const made = { main: () => main(shell) };
  specs.set(made, shell);
  return made;
}

export const specOf = (made: object) => specs.get(made);
