// proto/examples/parts.ts as a program, with the answers of the guide's "Input that has parts".
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const PARTS = join(PROTO, 'examples', 'parts.ts');

const hello = (home: string, ...argv: string[]) => program(PARTS, argv, { home });

test('points at the second place a name stands', async t => {
  const home = await scratch(t);
  const people = '{"people":[{"name":"Ada"},{"name":"Bob"},{"name":"Ada"}]}';
  const { exit, out } = await hello(home, 'greet-all', '--json', people);
  const issue = answerIn(out, z.unknown()).issues?.[0];
  assert.equal(exit, 1);
  assert.deepEqual([issue?.code, issue?.path], ['NAME_TWICE', 'people.2.name']);
});

test('lists its shapes, shows one, and refuses a part that fails it', async t => {
  const home = await scratch(t);
  const Shapes = z.object({ shapes: z.array(z.string()) });
  assert.deepEqual(answerIn((await hello(home, 'schema')).out, Shapes).result?.shapes, ['person']);
  const Shape = z.object({ shape: z.object({ required: z.array(z.string()) }) });
  const person = answerIn((await hello(home, 'schema', 'person')).out, Shape);
  assert.deepEqual(person.result?.shape.required, ['name']);
  const people = '{"people":[{"name":"Ada","lang":"xx"}]}';
  const refused = await hello(home, 'greet-all', '--json', people);
  const issue = answerIn(refused.out, z.unknown()).issues?.[0];
  assert.equal(refused.exit, 1);
  assert.deepEqual(
    [issue?.code, issue?.path, issue?.command],
    ['SCHEMA', 'people.0.lang', 'hello schema person'],
  );
});
