// proto/examples/datafolder.ts as a program, with the answers of the guide's "The data folder".
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { pending } from '../utils/pending.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const DATAFOLDER = join(PROTO, 'examples', 'datafolder.ts');
const Written = z.object({ file: z.string(), replaces: z.boolean() });

const hello = (home: string, ...argv: string[]) => program(DATAFOLDER, argv, { home });

pending('P6', 'a dry run of an edit shows what changes', async t => {
  const home = await scratch(t);
  await hello(home, 'friends', 'add', '--name', 'ada', '--lang', 'de');
  const edit = ['friends', 'edit', '--name', 'ada', '--lang', 'en', '--dry-run'];
  const { out } = await hello(home, ...edit);
  const Changed = z.object({ changes: z.object({ changed: z.array(z.string()) }) });
  assert.deepEqual(answerIn(out, Changed).result?.changes.changed, ['lang']);
});

pending('P6', 'an export builds its file again without --replace', async t => {
  const home = await scratch(t);
  const exported = ['friends', 'export', '--file', 'public/friends.txt'];
  await hello(home, 'friends', 'add', '--name', 'ada', '--lang', 'de');
  const first = answerIn((await hello(home, ...exported)).out, Written).result;
  assert.deepEqual([first?.file, first?.replaces], ['public/friends.txt', false]);
  await hello(home, 'friends', 'add', '--name', 'bob', '--lang', 'en');
  const second = await hello(home, ...exported);
  const again = answerIn(second.out, Written).result;
  assert.equal(second.exit, 0);
  assert.deepEqual([again?.file, again?.replaces], ['public/friends.txt', true]);
  const schema = await hello(home, 'schema', 'friends', 'export');
  assert.equal(answerIn(schema.out, z.object({ replace: z.string() })).result?.replace, 'always');
});

pending('P6', 'a data folder that is empty or missing is refused', async t => {
  const home = await scratch(t);
  const env = { HELLO_HOME: '' };
  const empty = await program(DATAFOLDER, ['friends', 'add', '--name'], { home, env });
  assert.equal(empty.exit, 1);
  assert.equal(answerIn(empty.out, z.unknown()).issues?.[0]?.code, 'ROOT_NOT_FOUND');
  const missing = await hello(home, 'friends', 'add', '--name', '--home', join(home, 'nope'));
  assert.equal(missing.exit, 1);
  assert.equal(answerIn(missing.out, z.unknown()).issues?.[0]?.code, 'ROOT_NOT_FOUND');
});
