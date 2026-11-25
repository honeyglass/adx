/**
 * One call of a tool as a real program, for the test kit's conformance with a command line.
 *
 * program: starts the command line with the arguments of the call as a process in the folders of
 * a scratch, and answers its exit code and what it wrote.
 *
 * The program sees no variable of the person: only PATH, so `node` is found, its home and temp
 * folders in the scratch, which no variable of the test replaces, and the variables the test
 * names. A word is a path only with a slash in it: the program, which is else looked up in PATH,
 * so a file named `node` is never run for `node`, and a file of the folder the test runs in,
 * such as bin/tracker.ts, made absolute, since the program runs in the working directory of the
 * scratch. Any other word, such as the value of an option, stays as it is. stdin holds the given text, else it
 * ends at once. The program leads a process group of its own: when it ends, or when it does not
 * end in time, the whole group is killed, so a child it left cannot hold the pipes open, and a
 * killed call answers no exit code.
 *
 * @example const ran = await program(['node', 'bin/tracker.ts'], { argv: ['schema'], ...folders });
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { text } from 'node:stream/consumers';
import { $try, trySync$ } from '@honeyglass/utils/ts';
import { fileNotFound, NOTHING_CHANGED, refusedWith } from "../core/index.js";
import { hold } from "./held.js";
import { PROGRAM_MS } from "./limits.js";
/**
 * @param words - the command line that starts the tool, such as ['node', 'bin/tracker.ts']
 * @param call - the arguments, the folders, the variables and stdin of the call
 * @returns the exit code, or null for a program that was killed, and what it wrote
 * @throws a refusal FILE_NOT_FOUND at `command` when the command line starts no program
 */
export async function program(words, call) {
    const [first = '', ...rest] = words;
    const file = first.includes('/') ? resolve(first) : first;
    const args = rest.map(word => (word.includes('/') && existsSync(word) ? resolve(word) : word));
    // The kit's own folders win over a variable of the call.
    const env = { ...call.env, PATH: process.env.PATH ?? '', HOME: call.home, TMPDIR: call.tmp };
    const child = spawn(file, [...args, ...call.argv], { cwd: call.cwd, env, detached: true });
    const release = hold(() => endGroup(child.pid));
    const timer = setTimeout(release, PROGRAM_MS);
    // What the program started goes with it, so no child of it holds the pipes open.
    child.once('exit', release);
    child.stdin.end(call.stdin ?? undefined);
    const { data, error } = await $try(() => Promise.all([text(child.stdout), text(child.stderr), once(child, 'close')]));
    clearTimeout(timer);
    release();
    if (error === null) {
        const [out, err, [exit]] = data;
        return { exit: typeof exit === 'number' ? exit : null, out, err };
    }
    const message = `the command line ${words.join(' ')} starts no program`;
    throw refusedWith([fileNotFound.at('command', message)], NOTHING_CHANGED, error);
}
/**
 * The program leads a group of its own, so SIGKILL to the group ends what it started too. A group
 * that is gone, or a program that never started, leaves nothing to end.
 */
function endGroup(pid) {
    if (pid !== undefined)
        trySync$(() => process.kill(-pid, 'SIGKILL'));
}
