// proto/examples/read.ts as a program, with the answers of the guide's "A command that reads".
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { pending } from '../utils/pending.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const READ = join(PROTO, 'examples', 'read.ts');
const HALLO = '{"ok":true,"result":{"greeting":"Hallo, Ada!"}}\n';

const hello = (home: string, ...argv: string[]) => program(READ, argv, { home });

test('takes the input from options, --json or both', async t => {
  const home = await scratch(t);
  assert.equal((await hello(home, 'greet', '--name', 'Ada', '--lang', 'de')).out, HALLO);
  assert.equal((await hello(home, 'greet', '--json', '{"name":"Ada","lang":"de"}')).out, HALLO);
  assert.equal((await hello(home, 'greet', '--name', 'Ada', '--json', '{"lang":"de"}')).out, HALLO);
  const twice = await hello(home, 'greet', '--name', 'Ada', '--json', '{"name":"Bob"}');
  assert.equal(twice.exit, 1);
  assert.equal(answerIn(twice.out, z.unknown()).issues?.[0]?.code, 'REPEATED_OPTION');
});

test('lists the values of an option, and refuses one outside', async t => {
  const home = await scratch(t);
  const Values = z.object({ values: z.array(z.object({ value: z.string() })) });
  const listed = answerIn((await hello(home, 'greet', '--lang')).out, Values);
  assert.deepEqual(
    listed.result?.values.map(v => v.value),
    ['en', 'de', 'eo'],
  );
  const outside = await hello(home, 'greet', '--name', 'Ada', '--lang', 'xx');
  const issue = answerIn(outside.out, z.unknown()).issues?.[0];
  assert.equal(outside.exit, 1);
  assert.deepEqual([issue?.code, issue?.command], ['NOT_IN_LIST', 'hello greet --name Ada --lang']);
});

pending('P5', 'shows the input it accepts as JSON Schema', async t => {
  const home = await scratch(t);
  const { exit, out } = await hello(home, 'schema', 'greet');
  const Input = z.object({
    required: z.array(z.string()),
    properties: z.object({ lang: z.object({ enum: z.array(z.string()) }) }),
  });
  const input = answerIn(out, z.object({ input: Input })).result?.input;
  assert.equal(exit, 0);
  assert.deepEqual(input?.required, ['name']);
  assert.deepEqual(input?.properties.lang.enum, ['en', 'de', 'eo']);
});
