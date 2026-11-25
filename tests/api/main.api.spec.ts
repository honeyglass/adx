import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { text } from 'node:stream/consumers';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { program, scratch } from '../utils/program.ts';

const LOST = fileURLToPath(new URL('../fixtures/lost.program.ts', import.meta.url));
const CHATTY = fileURLToPath(new URL('../fixtures/chatty.program.ts', import.meta.url));

/** Ten seconds, far beyond the tenth of a second one call takes, so only a hang reaches it. */
const TIMEOUT_MS = 10_000;

/**
 * The call, with a line on stdin once its answer stands on stdout: the signal on which the
 * fixture leaves its late error.
 */
async function afterAnswer(command: string, home: string) {
  const env = { PATH: process.env.PATH, HOME: home };
  const options = { cwd: home, env, timeout: TIMEOUT_MS, killSignal: 'SIGKILL' as const };
  const child = spawn(process.execPath, [LOST, command], options);
  const err = text(child.stderr);
  const closed = once(child, 'close');
  let out = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    if (out.endsWith('\n') === false && (out + chunk).endsWith('\n')) child.stdin.write('go\n');
    out += chunk;
  });
  const [exit, signal] = await closed;
  assert.equal(signal, null, `lost ${command} ran past ${TIMEOUT_MS} ms and was killed`);
  return { exit, out, err: await err };
}

test('a rejection no await reaches, before the answer, is the one bug answer with exit 2', async t => {
  const home = await scratch(t);
  const { exit, out, err } = await program(LOST, ['early'], { home });
  assert.equal(exit, 2);
  const lines = out.trimEnd().split('\n');
  assert.equal(lines.length, 1);
  const answer = JSON.parse(lines[0] ?? '');
  assert.deepEqual(
    [answer.ok, answer.kind, answer.issues.map((i: { code: string }) => i.code)],
    [false, 'bug', ['UNKNOWN_ERROR']],
  );
  assert.match(err, /lost before the answer/);
});

test('an error no await reaches, after the answer, goes to stderr with exit 2', async t => {
  const home = await scratch(t);
  for (const [command, said] of [
    ['late', /lost after the answer/],
    ['thrown', /SyntaxError/],
  ] as const) {
    const { exit, out, err } = await afterAnswer(command, home);
    assert.deepEqual([exit, out], [2, '{"ok":true,"result":{"done":true}}\n']);
    assert.match(err, said);
  }
});

test('the first lost error ends the program, beside an open timer and when it comes again', async t => {
  const home = await scratch(t);
  for (const [command, said] of [
    ['open', 'lost beside an open timer'],
    ['repeated', 'lost again'],
  ] as const) {
    // program() kills a call that does not end within its time limit, and the test fails
    const { exit, out, err } = await program(LOST, [command], { home });
    assert.deepEqual([exit, out.trimEnd().split('\n').length], [2, 1]);
    // one bug, whose cause line names the error once
    assert.equal(err.split(`Cause: Error: ${said}`).length - 1, 1);
  }
});

test('while a call runs, every other write to stdout goes to stderr, so stdout holds its JSON answer alone', async t => {
  const home = await scratch(t);
  const { exit, out, err } = await program(CHATTY, ['say'], { home });
  const answer = '{"ok":true,"result":{"said":true}}\n';
  assert.deepEqual([exit, out], [0, `${answer}${answer}`]);
  assert.equal(err, 'a line of console.log\na write to stdout\n'.repeat(2));
});

test('run in the process of a test leaves no handler on the process, and stdout as it was', async () => {
  const greet = read({ does: 'greets', run: () => ({ greeting: 'Hello!' }) });
  const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet } });
  const events = ['uncaughtException', 'unhandledRejection'] as const;
  const before = events.map(event => process.listenerCount(event));
  const write = process.stdout.write;
  const { exit } = await run(hello, ['greet']);
  await greet.invoke({});
  assert.deepEqual([exit, events.map(event => process.listenerCount(event))], [0, before]);
  // and stdout writes where it wrote before
  assert.equal(process.stdout.write, write);
});
