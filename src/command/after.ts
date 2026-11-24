/**
 * Steps after a command, given where the tool is put together, for a step that crosses folders.
 *
 * After, after: the steps that follow one command or each command of a list.
 * followsOf: the commands an after follows, and its function, for the tool.
 *
 * Nothing is checked when after() is called: the call checks that the tool lists each command.
 *
 * @example tool({ ..., next: [after(whoami, () => [tickets.step()])] });
 */
import type { Step } from '../core/index.ts';
import type { AnyCommand, Command, GlobalOf, InputOf, RealOf } from './command.ts';
import type { All, Obj } from './types.ts';

declare const follows: unique symbol;

export interface After<G extends Obj> {
  readonly [follows]: (global: G) => G;
}

/** The function as a method, so the one of every typed after fits it without a cast. */
type Follows = {
  commands: readonly object[];
  next(out: unknown, input: unknown): readonly Step[];
};

const followed = new WeakMap<object, Follows>();

/** @returns the commands and the function of an after, or undefined for any other value */
export const followsOf = (value: object) => followed.get(value);

/**
 * Next steps for a command, given where the tool is put together. They follow the steps of the
 * command's own `next`. For a step to a command that the command's own folder does not import.
 */
export function after<I extends Obj, O, G extends Obj, U, R>(
  command: Command<I, O, G, U, R>,
  next: (out: R, input: All<I, G, U>) => Step[],
): After<G>;
/** The same steps after each command of a list. `next` must fit every command of the list. */
export function after<const C extends readonly [AnyCommand, ...AnyCommand[]]>(
  commands: C,
  next: (out: RealOf<C[number]>, input: InputOf<C[number]>) => Step[],
): After<GlobalOf<C[number]>>;
export function after<G extends Obj>(
  commands: object | readonly object[],
  next: (out: never, input: never) => readonly Step[],
): After<G> {
  const made = new Following<G>();
  followed.set(made, { commands: Array.isArray(commands) ? commands : [commands], next });
  return made;
}

class Following<G extends Obj> implements After<G> {
  declare readonly [follows]: (global: G) => G;
}
