import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const greet = read({
  does: 'greets one person',
  input: z.object({ name: z.string(), lang: z.enum(['en', 'de']).default('en') }),
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${lang === 'de' ? 'Hallo' : 'Hello'}, ${name}!` }),
});

const strict = read({
  does: 'greets, and takes no other field',
  input: z.strictObject({ name: z.string() }),
  run: ({ name }) => ({ name }),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets',
  commands: { greet, strict },
});

const HALLO = { greeting: 'Hallo, Ada!' };

const answerOf = async (...argv: string[]) => {
  const { exit, out } = await run(hello, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

test('--json takes its object after = as well', async () => {
  assert.deepEqual((await answerOf('greet', '--json={"name":"Ada","lang":"de"}')).result, HALLO);
});

test('a text that is no JSON object is refused', async () => {
  for (const text of ['{"name":', '["Ada"]', 'null', '"Ada"']) {
    const answer = await answerOf('greet', '--json', text);
    assert.deepEqual(
      [text, answer.exit, answer.issues?.map(i => [i.code, i.path])],
      [text, 1, [['INVALID_JSON', 'json']]],
    );
  }
});

test('a field of --json the schema does not name is refused once, never dropped', async () => {
  for (const command of ['greet', 'strict']) {
    const answer = await answerOf(command, '--json', '{"name":"Ada","nmae":"Bob"}');
    assert.deepEqual(
      answer.issues?.map(i => [i.code, i.path, i.command]),
      [['SCHEMA', 'nmae', `hello schema ${command}`]],
    );
  }
});

test('--json without a value is refused', async () => {
  const answer = await answerOf('greet', '--json');
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path]),
    [['MISSING_VALUE', 'json']],
  );
});
