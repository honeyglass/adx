/**
 * What one call of the program gets from Node: its arguments, whether stdout is a terminal,
 * stdin, the variables, the home folder, the working directory, the disk, the store of a call and
 * the network.
 *
 * args: the arguments after the file, as Node got them.
 * around: the tokens of the arguments after the file, the terminal check that picks text or
 * JSON, the read of stdin, which only `--json -` starts, and the surroundings files read.
 *
 * @example const ran = await call(shell, around());
 */
import { homedir } from 'node:os';
import { argv, cwd, env, stdout } from 'node:process';
import { disk } from "./disk.js";
import { network } from "./network.js";
import { scope } from "./scope.js";
import { stdinText } from "./stdin.js";
import { tokensOf } from "./tokens.js";
/** @returns the arguments after the file, for a program that reads them itself, as adxcheck */
export const args = () => argv.slice(2);
export function around() {
    return {
        tokens: tokensOf(argv.slice(2)),
        tty: stdout.isTTY === true,
        stdin: stdinText,
        env,
        home: homedir(),
        cwd: cwd(),
        disk,
        scope,
        network,
    };
}
