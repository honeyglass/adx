/**
 * The tool: its commands put together, and main(), which runs one call.
 *
 * Tool, ToolSpec, Shell, tool: the tool, what tool() takes, what a call reads of it, and tool().
 * specOf: the spec of a tool that tool() made, for the test kit, which gets only the tool.
 *
 * Nothing is checked when tool() is called: a tool is built when its file loads, and a check
 * belongs in main() or the call. tool() only gives each command the words that call it.
 *
 * @example export const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet } });
 */
import { placeAll } from '../command/index.ts';
import type { Commands, Empty, Global, Obj, Table } from '../command/index.ts';
import { main } from './main.ts';

export interface Tool {
  /**
   * Runs one call. It is the outermost function: a refusal that reaches it is answered by its
   * kind, and any other error once, here, as a bug with exit code 2. It never rejects.
   */
  main(): Promise<void>;
}

export interface ToolSpec<G extends Obj> {
  name: string;
  version: string;
  does: string;
  /** Leave out for a tool whose commands share no input. */
  global?: Global<G>;
  /** Every command of the tool. A command built for another global input does not compile here. */
  commands: Commands<NoInfer<G>>;
}

/** What one call reads of a tool. */
export type Shell = { readonly name: string; readonly commands: Table };

/** A tool knows its spec; the table lets run() of the test kit find it from the tool alone. */
const specs = new WeakMap<object, Shell>();

export function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool {
  const shell: Shell = { name: spec.name, commands: spec.commands };
  placeAll(shell.commands, shell.name);
  const made = { main: () => main(shell) };
  specs.set(made, shell);
  return made;
}

export const specOf = (made: object) => specs.get(made);
