/**
 * The internal types of core/: what one call gets from its surroundings, and what it leaves.
 *
 * Around: the arguments, and whether stdout is a terminal.
 * Ran: the exit code and what the call wrote to stdout and stderr; the test kit's run answers it.
 *
 * main() takes them from Node, and run() from its options, so both go through one call.
 *
 * @example const ran = await call(spec, { argv: ['greet', '--name', 'Ada'], tty: false });
 */
import type { Exit } from './answer.ts';

export type Around = { readonly argv: readonly string[]; readonly tty: boolean };

export interface Ran {
  readonly exit: Exit;
  /** What the call wrote to stdout. */
  readonly out: string;
  /** What the call wrote to stderr. */
  readonly err: string;
}
