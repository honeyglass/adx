/**
 * One call of a proto tool as a real program, for the e2e tests.
 *
 * Call, Ran, program: what a call gets, what it wrote and its exit code, and the call itself.
 * scratch: a fresh folder for one test, removed after it.
 * PROTO: the folder of the proto tools.
 *
 * The program runs with no environment but PATH and HOME, so no variable of the person, such
 * as HELLO_HOME, reaches it, and its data folder of `~` lies in the test's scratch folder.
 * stdin is empty, and stdout is a pipe, so every answer is JSON. A call that does not end in
 * time is killed, and its test fails.
 *
 * @example const { exit, out } = await program(join(PROTO, 'hello.ts'), ['greet'], { home });
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

export const PROTO = fileURLToPath(new URL('../../proto', import.meta.url));

/** Ten seconds, far beyond the tenth of a second one call takes, so only a hang reaches it. */
const TIMEOUT_MS = 10_000;

export type Ran = { exit: number | null; out: string; err: string };

export type Call = {
  /** The home folder of the call, so `~/.hello` lies below it. */
  home: string;
  /** More variables, such as SHIP_URL. */
  env?: Record<string, string>;
};

/**
 * @param file - the absolute path of the .ts file Node runs
 * @param argv - the arguments after the file
 * @param call - the home folder, which is also the working directory, and more variables
 * @returns the exit code and what the call wrote to stdout and stderr
 */
export async function program(file: string, argv: readonly string[], call: Call): Promise<Ran> {
  const env = { PATH: process.env.PATH, HOME: call.home, ...call.env };
  const options = { cwd: call.home, env, timeout: TIMEOUT_MS, killSignal: 'SIGKILL' as const };
  const child = spawn(process.execPath, [file, ...argv], options);
  child.stdin.end();
  const [out, err, [exit, signal]] = await Promise.all([
    text(child.stdout),
    text(child.stderr),
    once(child, 'close'),
  ]);
  assert.equal(signal, null, `${file} ${argv.join(' ')} ran past ${TIMEOUT_MS} ms and was killed`);
  return { exit, out, err };
}

/** A fresh folder that the test `t` removes when it ends. */
export async function scratch(t: TestContext) {
  const folder = await mkdtemp(join(tmpdir(), 'adx-e2e-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
}
