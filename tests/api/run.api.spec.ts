import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { RefusalError } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { code, failed, read, Refused, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const refusal = (kind: Refusal['kind']): Refusal => ({
  kind,
  step: 'greet',
  reason: 'the greeting failed',
  next: 'tell the person',
  state: 'Nothing was greeted.',
});

const answering = <O>(run: () => O) =>
  read({ does: 'answers', input: z.object({}), example: {}, run });

const throwing = (error: Error) =>
  answering(() => {
    throw error;
  });

const noFormal = code('NO_FORMAL_GREETING', 'fix', 'Greet casually');

const atPart = noFormal
  .at(['people', 1, 'lang'], 'Esperanto has no formal greeting')
  .command({ does: 'shows the input', command: 'hello schema greet' });

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: {
    greet: read({
      does: 'greets one person',
      input: z.object({ name: z.string() }),
      example: { name: 'Ada' },
      run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
    crash: throwing(new TypeError('boom')),
    busy: throwing(failed('Nothing was greeted.', new RefusalError(refusal('retry')))),
    broken: throwing(new RefusalError(refusal('bug'))),
    shut: throwing(new RefusalError(refusal('blocked'))),
    returned: answering(() => failed('Nothing was greeted.', new RefusalError(refusal('retry')))),
    unsaid: throwing(failed('', new TypeError('boom'))),
    part: throwing(new Refused(refusal('fix'), [atPart])),
    empty: answering(() => ({})),
    nothing: answering(() => undefined),
    noisy: answering(() => {
      console.log('debug');
      console.error('working');
      return { done: true };
    }),
  },
});

test('a call through a pipe answers one JSON document and exit code 0', async () => {
  const ran = await run(hello, ['greet', '--name', 'Ada']);
  assert.deepEqual(ran, {
    exit: 0,
    out: '{"ok":true,"result":{"greeting":"Hello, Ada!"}}\n',
    err: '',
  });
});

test('a call at a terminal answers text, one field on a line', async () => {
  const { exit, out } = await run(hello, ['greet', '--name', 'Ada'], { tty: true });
  assert.equal(exit, 0);
  assert.equal(out, 'greeting  Hello, Ada!\n');
});

test('a result without fields prints as its JSON at a terminal, and no result prints nothing', async () => {
  assert.equal((await run(hello, ['empty'], { tty: true })).out, '{}\n');
  assert.equal((await run(hello, ['nothing'], { tty: true })).out, '');
  assert.equal((await run(hello, ['nothing'])).out, '{"ok":true}\n');
});

test('the text form escapes control characters, the JSON keeps them', async () => {
  const argv = ['greet', '--name', 'Ada\u001b[2J\u0007\u009b'];
  const { out } = await run(hello, argv, { tty: true });
  assert.equal(out, 'greeting  Hello, Ada\\u{1b}[2J\\u{7}\\u{9b}!\n');
  const piped = answerIn((await run(hello, argv)).out, z.object({ greeting: z.string() }));
  assert.equal(piped.result?.greeting, 'Hello, Ada\u001b[2J\u0007\u009b!');
});

test('a bug in a handler is UNKNOWN_ERROR of kind bug with exit code 2, named on stderr', async () => {
  const { exit, out, err } = await run(hello, ['crash']);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 2);
  assert.equal(answer.ok, false);
  assert.equal(answer.kind, 'bug');
  assert.deepEqual(
    answer.issues?.map(i => i.code),
    ['UNKNOWN_ERROR'],
  );
  assert.match(err, /TypeError: boom/);
});

test('a refusal a handler throws or returns is answered by its kind', async () => {
  const cases = [
    { command: 'busy', exit: 1, kind: 'retry' },
    { command: 'returned', exit: 1, kind: 'retry' },
    { command: 'broken', exit: 2, kind: 'bug' },
    { command: 'shut', exit: 1, kind: 'ask' },
  ];
  for (const expected of cases) {
    const { exit, out } = await run(hello, [expected.command]);
    const answer = answerIn(out, z.unknown());
    assert.deepEqual(
      { command: expected.command, exit, kind: answer.kind, state: answer.state, ok: answer.ok },
      { ...expected, state: 'Nothing was greeted.', ok: false },
    );
  }
});

test('a refusal without a state says what it left is not known, in JSON and as text', async () => {
  const state = 'The call stopped at an error; what it changed before is not known.';
  assert.equal(answerIn((await run(hello, ['unsaid'])).out, z.unknown()).state, state);
  const { out } = await run(hello, ['unsaid'], { tty: true });
  assert.equal(out.split('\n')[0], `refused (bug): ${state}`);
});

test('an issue below a field answers its path with dots and the command it was given', async () => {
  const answer = answerIn((await run(hello, ['part'])).out, z.unknown());
  assert.deepEqual(answer.issues, [
    {
      code: 'NO_FORMAL_GREETING',
      path: 'people.1.lang',
      message: 'Esperanto has no formal greeting',
      hint: 'Greet casually',
      command: 'hello schema greet',
    },
  ]);
  const { out } = await run(hello, ['part'], { tty: true });
  assert.equal(
    out,
    [
      'refused (fix): Nothing was greeted.',
      '',
      'NO_FORMAL_GREETING at people.1.lang',
      '  Esperanto has no formal greeting',
      '  hint  Greet casually',
      '  run   hello schema greet',
      '',
    ].join('\n'),
  );
});

test('what a handler writes with console stands before the answer in out and err', async () => {
  const { exit, out, err } = await run(hello, ['noisy']);
  assert.deepEqual(
    { exit, out, err },
    { exit: 0, out: 'debug\n{"ok":true,"result":{"done":true}}\n', err: 'working\n' },
  );
});

test('an unknown command is refused with exit code 1', async () => {
  const { exit, out } = await run(hello, ['grete']);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.equal(answer.kind, 'fix');
  assert.deepEqual(
    answer.issues?.map(i => i.code),
    ['UNKNOWN_COMMAND'],
  );
});

test('an input that fails the schema is refused before the handler runs', async () => {
  const { exit, out } = await run(hello, ['greet']);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path]),
    [['SCHEMA', 'name']],
  );
});

test('run refuses a value that tool() did not make', async () => {
  const made = run({ main: async () => {} }, ['greet']);
  await assert.rejects(made, (error: unknown) => error instanceof RefusalError);
});
