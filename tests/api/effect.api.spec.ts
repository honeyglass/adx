import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { code, effect, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const taken = code('NAME_TAKEN', 'fix', 'Pick another name');

const sent: string[] = [];

const add = effect({
  does: 'remembers a friend',
  input: z.object({ name: z.string() }),
  example: { name: 'ada' },
  plan: ({ name }, { refuse }) => (name === 'bob' ? refuse(taken.at('name')) : { name }),
  apply: ({ name }, { planned }) => {
    sent.push(name);
    return { id: `${planned.name}-1` };
  },
  look: () => note.step(),
});

const note = effect({
  does: 'notes a word',
  input: z.object({ word: z.string() }),
  example: { word: 'hi' },
  plan: ({ word }) => ({ word }),
  text: out => `noted ${out.word}`,
});

const odd = (planned: unknown) =>
  effect({
    does: 'plans no object',
    plan: () => planned,
    apply: () => {
      sent.push('odd');
      return { id: 1 };
    },
    look: () => note.step(),
  });

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { friends: { add }, note, text: odd('str'), list: odd(['a']) },
});

const REAL_RUN = { does: 'remembers a friend', command: 'hello friends add --name ada' };

test('a dry run answers the plan, applies nothing, and names the call for real', async () => {
  sent.length = 0;
  const { exit, out } = await run(hello, ['friends', 'add', '--name', 'ada', '--dry-run']);
  assert.equal(exit, 0);
  const next = JSON.stringify([REAL_RUN]);
  assert.equal(out, `{"ok":true,"applied":false,"result":{"name":"ada"},"next":${next}}\n`);
  assert.deepEqual(sent, []);
});

test('the real run answers the plan plus what apply returns', async () => {
  sent.length = 0;
  const { out } = await run(hello, ['friends', 'add', '--name', 'ada']);
  assert.equal(out, '{"ok":true,"applied":true,"result":{"name":"ada","id":"ada-1"}}\n');
  assert.deepEqual(sent, ['ada']);
});

test('a refusal in plan stops the call before apply', async () => {
  sent.length = 0;
  const { exit, out } = await run(hello, ['friends', 'add', '--name', 'bob']);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path]),
    [['NAME_TAKEN', 'name']],
  );
  assert.deepEqual(sent, []);
});

test('invoke runs a dry run when asked to', async () => {
  sent.length = 0;
  assert.deepEqual(await add.invoke({ name: 'ada' }, { dryRun: true }), {
    ok: true,
    applied: false,
    result: { name: 'ada' },
    next: [REAL_RUN],
  });
  assert.deepEqual(sent, []);
});

test('at a terminal, an effect prints its text and whether it applied', async () => {
  const { out } = await run(hello, ['note', '--word', 'hi'], { tty: true });
  assert.equal(out, 'noted hi\napplied  true\n');
  const fields = await run(hello, ['friends', 'add', '--name', 'ada', '--dry-run'], { tty: true });
  assert.equal(
    fields.out,
    'name     ada\napplied  false\n\nNext:\n  hello friends add --name ada   remembers a friend\n',
  );
});

test('with apply, a plan that answers no object is a DECLARATION error before apply runs', async () => {
  sent.length = 0;
  for (const argv of [['text'], ['text', '--dry-run'], ['list']]) {
    const { exit, out } = await run(hello, argv);
    const issues = answerIn(out, z.unknown()).issues?.map(i => i.code);
    assert.deepEqual([argv, exit, issues], [argv, 2, ['DECLARATION']]);
  }
  assert.deepEqual(sent, []);
});
