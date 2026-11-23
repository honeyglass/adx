// Guide, "Testing your tool": a tool with a data folder.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conformance, run } from '@honeyglass/adx/test';
import { add, hello } from '../hello2.ts';

const samples = { seed: 'test/seed' }; // holds the friend ada

test('hello keeps the agent rules', t => conformance(t, hello, samples));

test('a taken name needs --replace', async () => {
  const friend = { name: 'ada', lang: 'en' };
  const refused = await add.invoke(friend, samples);
  assert.equal(refused.issues?.[0]?.code, 'ALREADY_EXISTS');
  const options = { ...samples, replace: true };
  const replaced = await add.invoke(friend, options);
  assert.equal(replaced.result?.replaces, true);
});

test('a person at a terminal reads text', async () => {
  const { exit, out } = await run(hello, ['greet', '--name', 'Ada'], { ...samples, tty: true });
  assert.equal(exit, 0);
  assert.equal(out, 'Hello, Ada!\n');
});

test('the input can come through stdin', async () => {
  const stdin = '{"name":"Ada","lang":"de"}';
  const { out } = await run(hello, ['greet', '--json', '-'], { ...samples, stdin });
  assert.equal(JSON.parse(out).result.greeting, 'Hallo, Ada!');
});
