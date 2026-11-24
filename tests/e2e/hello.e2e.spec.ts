// proto/hello.ts as a program, with the answers of the guide's Quickstart, piped.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const HELLO = join(PROTO, 'hello.ts');

const hello = (home: string, ...argv: string[]) => program(HELLO, argv, { home });

test('greets Ada in one JSON document', async t => {
  const home = await scratch(t);
  const { exit, out } = await hello(home, 'greet', '--name', 'Ada');
  assert.equal(exit, 0);
  assert.equal(out, '{"ok":true,"result":{"greeting":"Hello, Ada!"}}\n');
});

test('a reader that leaves before the answer ends the call quietly', async t => {
  const home = await scratch(t);
  const ran = await program(HELLO, ['greet', '--name', 'Ada'], { home, gone: true });
  assert.deepEqual({ exit: ran.exit, err: ran.err }, { exit: 0, err: '' });
});

test('refuses both mistakes of one call at once', async t => {
  const home = await scratch(t);
  const { exit, out } = await hello(home, 'greet', '--nmae', 'Ada', 'again');
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.equal(answer.ok, false);
  assert.equal(answer.kind, 'fix');
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path, i.command]),
    [
      ['UNKNOWN_OPTION', 'nmae', 'hello schema greet'],
      ['UNEXPECTED_ARGUMENT', 'again', 'hello schema greet'],
    ],
  );
});

test('called alone, names itself and the step to schema', async t => {
  const home = await scratch(t);
  const { exit, out } = await hello(home);
  const Start = z.object({ name: z.string(), skill: z.string().nullable() });
  const answer = answerIn(out, Start);
  assert.equal(exit, 0);
  assert.deepEqual(answer.result, { name: 'hello', skill: null });
  assert.deepEqual(answer.next, [
    { does: 'shows every command and its input', command: 'hello schema' },
  ]);
});
