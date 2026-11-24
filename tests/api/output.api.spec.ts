import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: {
    greet: read({
      does: 'greets one person',
      input: z.object({ name: z.string() }),
      run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
      text: out => out.greeting,
    }),
  },
});

test('--output forces the form of every call, whatever stdout is', async () => {
  const json = await run(hello, ['greet', '--name', 'Ada', '--output', 'json'], { tty: true });
  assert.equal(json.out, '{"ok":true,"result":{"greeting":"Hello, Ada!"}}\n');
  const text = await run(hello, ['greet', '--name', 'Ada', '--output=text']);
  assert.equal(text.out, 'Hello, Ada!\n');
  const alone = await run(hello, ['--output', 'text']);
  assert.match(alone.out, /^hello 0\.1\.0: greets people\n/);
  const schema = await run(hello, ['schema', '--output', 'json'], { tty: true });
  assert.equal(answerIn(schema.out, z.unknown()).ok, true);
  const refused = await run(hello, ['greet', '--output', 'json'], { tty: true });
  assert.deepEqual(
    answerIn(refused.out, z.unknown()).issues?.map(i => i.code),
    ['SCHEMA'],
  );
});

test('--output alone lists the two forms, and beside anything else is refused', async () => {
  for (const argv of [
    ['greet', '--name', 'Ada', '--output'],
    ['greet', '--output'],
  ]) {
    const beside = answerIn((await run(hello, argv)).out, z.unknown());
    assert.deepEqual(
      beside.issues?.map(i => [i.code, i.path, i.command]),
      [['MISSING_VALUE', 'output', 'hello --output']],
    );
  }
  const { exit, out } = await run(hello, ['--output']);
  assert.equal(exit, 0);
  assert.deepEqual(answerIn(out, z.unknown()).result, {
    option: 'output',
    values: [
      { value: 'text', does: 'text for a person' },
      { value: 'json', does: 'one JSON document for a program' },
    ],
  });
});

test('another form, or --output twice, is refused and never falls back', async () => {
  const other = await run(hello, ['greet', '--name', 'Ada', '--output', 'xml'], { tty: true });
  assert.equal(other.exit, 1);
  assert.match(other.out, /^refused \(fix\)/);
  const outside = answerIn((await run(hello, ['greet', '--output', 'xml'])).out, z.unknown());
  assert.deepEqual(
    outside.issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'output', 'hello --output']],
  );
  const twice = await run(hello, ['greet', '--output', 'json', '--output', 'text']);
  assert.deepEqual(
    answerIn(twice.out, z.unknown()).issues?.map(i => [i.code, i.path]),
    [['REPEATED_OPTION', 'output']],
  );
});
