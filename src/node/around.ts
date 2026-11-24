/**
 * What one call of the program gets from Node: its arguments, whether stdout is a terminal, and
 * stdin.
 *
 * around: the tokens of the arguments after the file, the terminal check that picks text or
 * JSON, and the read of stdin, which only `--json -` starts.
 *
 * @example const ran = await call(shell, around());
 */
import { argv, stdout } from 'node:process';
import type { Around } from '../core/index.ts';
import { stdinText } from './stdin.ts';
import { tokensOf } from './tokens.ts';

export function around(): Around {
  return { tokens: tokensOf(argv.slice(2)), tty: stdout.isTTY === true, stdin: stdinText };
}
