/**
 * One call of a tool as a real program, for the test kit's conformance with a command line.
 *
 * program: starts the command line with the arguments of the call as a process in the folders of
 * a scratch, and answers its exit code and what it wrote.
 *
 * The program sees no variable of the person: only PATH, so `node` is found, its home and temp
 * folders in the scratch, and the variables the test names. A word of the command line that
 * names a file of the folder the test runs in, such as bin/tracker.ts, is made absolute, since
 * the program runs in the working directory of the scratch. stdin holds the given text, else it
 * ends at once. A call that does not end in time is killed and answers no exit code.
 *
 * @example const ran = await program(['node', 'bin/tracker.ts'], { argv: ['schema'], ...folders });
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { text } from 'node:stream/consumers';
import { $try, RefusalError } from '@honeyglass/utils/ts';
import { PROGRAM_MS } from "./limits.js";
/**
 * @param words - the command line that starts the tool, such as ['node', 'bin/tracker.ts']
 * @param call - the arguments, the folders, the variables and stdin of the call
 * @returns the exit code, or null for a program that was killed, and what it wrote
 * @throws a fix RefusalError when the command line starts no program
 */
export async function program(words, call) {
    const [file = '', ...args] = words.map(word => (existsSync(word) ? resolve(word) : word));
    const env = { PATH: process.env.PATH ?? '', HOME: call.home, TMPDIR: call.tmp, ...call.env };
    const options = { cwd: call.cwd, env, timeout: PROGRAM_MS, killSignal: 'SIGKILL' };
    const child = spawn(file, [...args, ...call.argv], options);
    child.stdin.end(call.stdin ?? undefined);
    const { data, error } = await $try(() => Promise.all([text(child.stdout), text(child.stderr), once(child, 'close')]));
    if (error === null) {
        const [out, err, [exit]] = data;
        return { exit: typeof exit === 'number' ? exit : null, out, err };
    }
    throw new RefusalError({
        kind: 'fix',
        step: 'conformance',
        reason: `the command line ${words.join(' ')} starts no program`,
        next: 'pass the words that start the tool, such as node and the file that calls main',
        cause: error,
    });
}
