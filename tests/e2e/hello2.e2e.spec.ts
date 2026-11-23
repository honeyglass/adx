// proto/hello2.ts as a program, with the answers of the guide's "Basics" that its data gives.
//
// hello2 keeps 4 languages where the guide speaks of 42, so a list has one page and no step to
// the next one. The file loads only once every value it imports is built.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { pending } from '../utils/pending.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const HELLO2 = join(PROTO, 'hello2.ts');
const Items = z.object({ items: z.array(z.unknown()) });

const hello = (home: string, ...argv: string[]) => program(HELLO2, argv, { home });

pending('P7', 'lists the languages in an outline, and names the command for one', async t => {
  const home = await scratch(t);
  const listed = answerIn((await hello(home, 'languages')).out, Items);
  assert.deepEqual(listed.result?.items[0], { code: 'ar', name: 'Arabic' });
  assert.deepEqual(listed.next, [
    { does: 'shows one language in full', command: 'hello language', needs: ['code'] },
  ]);
  const named = answerIn((await hello(home, 'languages', '--fields', 'code,formal')).out, Items);
  assert.deepEqual(named.result?.items[0], { code: 'ar', formal: 'As-salamu alaykum' });
  const Values = z.object({ values: z.array(z.object({ value: z.string() })) });
  const fields = answerIn((await hello(home, 'languages', '--fields')).out, Values);
  assert.deepEqual(
    fields.result?.values.map(v => v.value),
    ['code', 'name', 'hello', 'formal'],
  );
});

pending('P7', 'the start leads to a first friend, and a new friend to a greeting', async t => {
  const home = await scratch(t);
  const start = answerIn((await hello(home)).out, z.unknown());
  assert.deepEqual(start.next?.[0], {
    does: 'remembers a friend',
    command: 'hello friends add',
    needs: ['name', 'lang'],
  });
  const added = await hello(home, 'friends', 'add', '--name', 'bob', '--lang', 'de');
  assert.deepEqual(answerIn(added.out, z.unknown()).next?.[0], {
    does: 'greets one person',
    command: 'hello greet --lang de',
    needs: ['name'],
  });
});

pending('P7', 'a refusal names the language that has no formal greeting', async t => {
  const home = await scratch(t);
  const argv = ['greet', '--name', 'Ada', '--lang', 'eo', '--style', 'formal'];
  const { exit, out } = await hello(home, ...argv);
  assert.equal(exit, 1);
  assert.equal(answerIn(out, z.unknown()).issues?.[0]?.command, 'hello language --code eo');
});

pending('P7', 'a data folder moved by its variable rides along in the next step', async t => {
  const home = await scratch(t);
  const moved = join(home, 'h');
  await mkdir(moved);
  const argv = ['friends', 'add', '--name', 'eve', '--lang', 'de'];
  const { out } = await program(HELLO2, argv, { home, env: { HELLO_HOME: moved } });
  assert.equal(
    answerIn(out, z.unknown()).next?.[0]?.command,
    `hello greet --lang de --home ${moved}`,
  );
});

pending('P7', 'the schema says what each kind asks, and every code', async t => {
  const home = await scratch(t);
  const Schema = z.object({
    kinds: z.object({ ask: z.object({ exit: z.number() }) }),
    codes: z.array(z.object({ code: z.string(), kind: z.string() })),
  });
  const { exit, out } = await hello(home, 'schema');
  const schema = answerIn(out, Schema).result;
  assert.equal(exit, 0);
  assert.equal(schema?.kinds.ask.exit, 1);
  assert.deepEqual(schema?.codes[0], { code: 'UNKNOWN_COMMAND', kind: 'fix' });
});
