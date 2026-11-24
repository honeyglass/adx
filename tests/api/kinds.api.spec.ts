import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { code, list, read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');
const shortName = code('SHORT_NAME', 'fix', 'Pass a name of two letters or more');

const ran: string[] = [];

const greet = read({
  does: 'greets one person',
  input: z.object({ name: z.string(), times: z.number().default(1) }),
  example: { name: 'Ada' },
  check: ({ name }) => [
    ...(name.trim() === '' ? [blankName.at('name')] : []),
    ...(name.length < 2 ? [shortName.at('name')] : []),
  ],
  run: ({ name }) => {
    ran.push(name);
    return { greeting: `Hello, ${name}!` };
  },
  text: out => out.greeting,
});

const Language = z.object({ code: z.string(), name: z.string() });

const languages = list({
  does: 'lists the languages',
  item: Language,
  key: 'code',
  outline: ['name'],
  pageSize: 2,
  run: (_, { page }) => ({ items: [{ code: 'de', name: 'German' }], total: page.size }),
});

const sized = list({
  does: 'answers the size of its page',
  item: Language,
  key: 'code',
  outline: ['name'],
  run: (_, { page }) => ({ items: [], total: page.size }),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { greet, languages, sized },
});

test('check answers every issue at once, and the handler runs only when it passed', async () => {
  ran.length = 0;
  const { exit, out } = await run(hello, ['greet', '--name', ' ']);
  assert.equal(exit, 1);
  assert.deepEqual(
    answerIn(out, z.unknown()).issues?.map(i => [i.code, i.path]),
    [
      ['BLANK_NAME', 'name'],
      ['SHORT_NAME', 'name'],
    ],
  );
  assert.deepEqual(ran, []);
});

test('check runs only on an input that passed the schema', async () => {
  ran.length = 0;
  const { out } = await run(hello, ['greet', '--times', 'x']);
  assert.deepEqual(
    answerIn(out, z.unknown()).issues?.map(i => i.code),
    ['SCHEMA', 'SCHEMA'],
  );
  assert.deepEqual(ran, []);
});

test('text sets the terminal form of a read, and JSON stays whole', async () => {
  assert.equal((await run(hello, ['greet', '--name', 'Ada'], { tty: true })).out, 'Hello, Ada!\n');
  assert.equal(
    (await run(hello, ['greet', '--name', 'Ada'])).out,
    '{"ok":true,"result":{"greeting":"Hello, Ada!"}}\n',
  );
});

test('a list answers what its handler returns for the page', async () => {
  const { exit, out } = await run(hello, ['languages']);
  assert.equal(exit, 0);
  assert.equal(out, '{"ok":true,"result":{"items":[{"code":"de","name":"German"}],"total":2}}\n');
});

test('a read and a list refuse --dry-run as an unknown option', async () => {
  for (const command of ['greet', 'languages']) {
    const { exit, out } = await run(hello, [command, '--dry-run']);
    const issues = answerIn(out, z.unknown()).issues?.map(i => [i.code, i.path]);
    assert.deepEqual([command, exit, issues], [command, 1, [['UNKNOWN_OPTION', 'dry-run']]]);
  }
});

test('a list that names no page size gets a page of 50', async () => {
  const { out } = await run(hello, ['sized']);
  assert.equal(out, '{"ok":true,"result":{"items":[],"total":50}}\n');
});
