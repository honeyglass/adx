/**
 * The input every command of a tool shares, such as `--project`.
 *
 * Global, global: the shared input, and the three kinds with it typed into every handler and
 * its sources known to every command.
 *
 * With global() the input is declared before the commands, so a command knows its type without
 * importing the tool; the tool takes the same value as its `global`.
 *
 * @example const { read } = global({ input: z.object({ project: id() }), example: { project: 'web' } });
 */
import { Kinds } from './kinds.ts';
import type { Always, Free, Given, Obj, Shared, Values } from './types.ts';

export class Global<G extends Obj> extends Kinds<G> {
  readonly input: G;

  constructor(input: G, values: Shared['values']) {
    super({ input, values });
    this.input = input;
  }
}

/** A global field goes to every kind of command, so it takes no name of an option of any kind. */
export function global<G extends Obj>(spec: {
  input: G & Free<G, Always | 'page' | 'fields'>;
  example: Given<G>;
  values?: Values<G, G>;
}): Global<G> {
  return new Global<G>(spec.input, spec.values ?? {});
}
