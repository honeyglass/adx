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

const tagged = read({
  does: 'keeps tags',
  input: z.object({ tags: z.record(z.string(), z.string()) }),
  run: ({ tags }) => ({ tags }),
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
  commands: { greet, strict, tagged },
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

test('--json - reads the object from stdin, beside the options', async () => {
  const stdin = '{"name":"Ada","lang":"de"}';
  const piped = await run(hello, ['greet', '--json', '-'], { stdin });
  assert.deepEqual(answerIn(piped.out, z.unknown()).result, HALLO);
  const both = await run(hello, ['greet', '--name', 'Ada', '--json', '-'], {
    stdin: '{"lang":"de"}',
  });
  assert.deepEqual(answerIn(both.out, z.unknown()).result, HALLO);
});

test('--json - is refused when nothing is piped in, and when stdin holds no object', async () => {
  const cases = [
    { stdin: null, code: 'MISSING_INPUT' },
    { stdin: '', code: 'MISSING_INPUT' },
    { stdin: ' \n', code: 'MISSING_INPUT' },
    { stdin: '["Ada"]', code: 'INVALID_JSON' },
  ];
  for (const { stdin, code } of cases) {
    const { exit, out } = await run(hello, ['greet', '--json', '-'], { stdin });
    const answer = answerIn(out, z.unknown());
    assert.deepEqual(
      [code, exit, answer.issues?.map(i => [i.code, i.path])],
      [code, 1, [[code, 'json']]],
    );
  }
});

// '😀' is one character and two UTF-16 units, so a count of units would refuse the first call.
test('--json - takes stdin up to 1048576 characters, and refuses one more', async () => {
  const of = (length: number) => `{"name":"${'😀'.repeat(length - 11)}"}`;
  const atLimit = await run(hello, ['greet', '--json', '-'], { stdin: of(1_048_576) });
  assert.equal(atLimit.exit, 0);
  const above = await run(hello, ['greet', '--json', '-'], { stdin: of(1_048_577) });
  assert.deepEqual(
    answerIn(above.out, z.unknown()).issues?.map(i => [i.code, i.path]),
    [['INPUT_TOO_LARGE', 'json']],
  );
});

test('--help answers without reading stdin', async () => {
  const { exit, out } = await run(hello, ['greet', '--json', '-', '--help']);
  assert.equal(exit, 0);
  assert.equal(
    z.object({ command: z.string() }).parse(answerIn(out, z.unknown()).result).command,
    'hello greet',
  );
});

test('a key __proto__ is refused at any depth of the raw input, never dropped', async () => {
  const cases = [
    ['{"tags":{"__proto__":"x"}}', 'tags.__proto__'],
    ['{"tags":{},"__proto__":{}}', '__proto__'],
  ];
  for (const [json, path] of cases) {
    const answer = await answerOf('tagged', '--json', json ?? '');
    assert.deepEqual(
      [json, answer.exit, answer.issues?.map(i => [i.code, i.path])],
      [json, 1, [['SCHEMA', path]]],
    );
  }
  const piped = await run(hello, ['tagged', '--json', '-'], {
    stdin: '{"tags":{"__proto__":"x"}}',
  });
  assert.deepEqual(
    answerIn(piped.out, z.unknown()).issues?.map(i => [i.code, i.path]),
    [['SCHEMA', 'tags.__proto__']],
  );
});
