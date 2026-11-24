/**
 * What one call of the program gets from Node: its arguments, and whether stdout is a terminal.
 *
 * around: the tokens of the arguments after the file, and the terminal check that picks text or
 * JSON.
 *
 * @example const ran = await call(shell, around());
 */
import { argv, stdout } from 'node:process';
import { tokensOf } from "./tokens.js";
export function around() {
    return { tokens: tokensOf(argv.slice(2)), tty: stdout.isTTY === true };
}
