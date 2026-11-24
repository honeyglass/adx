/**
 * What one call of the program gets from Node: its arguments, and whether stdout is a terminal.
 *
 * around: the arguments after the file, and the terminal check that picks text or JSON.
 *
 * @example const ran = await call(spec, around());
 */
import { argv, stdout } from 'node:process';
import type { Around } from '../core/index.ts';

export function around(): Around {
  return { argv: argv.slice(2), tty: stdout.isTTY === true };
}
