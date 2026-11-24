import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const echo = read({
  does: 'answers its input',
  input: z.object({
    name: z.string().describe('who to greet'),
    dueDate: z.string().optional(),
    count: z.number().optional(),
    strict: z.boolean().optional(),
    label: z.array(z.string()).optional(),
    people: z.array(z.object({ name: z.string() })).optional(),
    baseURL: z.string().optional(),
    Mode: z.string().optional(),
  }),
  example: { name: 'Ada' },
  run: input => input,
});

const hello = tool({ name: 'hello', version: '0.1.0', does: 'echoes', commands: { echo } });

const resultOf = async (...argv: string[]) => answerIn((await run(hello, argv)).out, z.unknown());

const issuesOf = async (...argv: string[]) => {
  const { exit, out } = await run(hello, argv);
  const answer = answerIn(out, z.unknown());
  return { exit, kind: answer.kind, issues: answer.issues?.map(i => [i.code, i.path]) };
};

test('an unknown option names its value, and each mistake names the call that shows the input', async () => {
  const { exit, out } = await run(hello, ['echo', '--nmae', 'Ada', 'again']);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.equal(answer.state, 'Nothing was changed.');
  assert.deepEqual(answer.issues, [
    {
      code: 'UNKNOWN_OPTION',
      path: 'nmae',
      message: 'echo has no option --nmae (its value was Ada)',
      hint: 'Use an option the command lists',
      command: 'hello schema echo',
    },
    {
      code: 'UNEXPECTED_ARGUMENT',
      path: 'again',
      message: 'echo takes no word after its options',
      hint: 'Remove the word, or pass it as the value of an option',
      command: 'hello schema echo',
    },
  ]);
});

test('a field is the option of its name in kebab case, with = or the next word as value', async () => {
  const answer = await resultOf('echo', '--name=-Ada', '--due-date', 'friday');
  assert.deepEqual(answer.result, { name: '-Ada', dueDate: 'friday' });
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '--dueDate', 'x')).issues, [
    ['UNKNOWN_OPTION', 'dueDate'],
  ]);
  const runs = await resultOf('echo', '--name', 'Ada', '--base-url', 'u', '--mode', 'm');
  assert.deepEqual(runs.result, { name: 'Ada', baseURL: 'u', Mode: 'm' });
});

test('a number is read from its text, and a text that is no number fails the schema', async () => {
  assert.deepEqual((await resultOf('echo', '--name', 'Ada', '--count', '3')).result, {
    name: 'Ada',
    count: 3,
  });
  assert.deepEqual((await resultOf('echo', '--name', 'Ada', '--count=-2.5')).result, {
    name: 'Ada',
    count: -2.5,
  });
  for (const text of ['three', '0x10', '0b11', '1e3', ' 5 ', '', '5.']) {
    const { issues } = await issuesOf('echo', '--name', 'Ada', `--count=${text}`);
    assert.deepEqual([text, issues], [text, [['SCHEMA', 'count']]]);
  }
});

test('a boolean is a switch that takes no value', async () => {
  assert.deepEqual((await resultOf('echo', '--name', 'Ada', '--strict')).result, {
    name: 'Ada',
    strict: true,
  });
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '--strict=false')).issues, [
    ['UNEXPECTED_VALUE', 'strict'],
  ]);
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '--strict', 'yes')).issues, [
    ['UNEXPECTED_ARGUMENT', 'yes'],
  ]);
});

test('only an array field takes its option again', async () => {
  const answer = await resultOf('echo', '--name', 'Ada', '--label', 'bug', '--label', 'payments');
  assert.deepEqual(answer.result, { name: 'Ada', label: ['bug', 'payments'] });
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '--name', 'Bob')).issues, [
    ['REPEATED_OPTION', 'name'],
  ]);
});

test('an option followed by an option, or at the end, came without a value', async () => {
  assert.deepEqual((await issuesOf('echo', '--name', '--due-date')).issues, [
    ['MISSING_VALUE', 'name'],
    ['MISSING_VALUE', 'dueDate'],
  ]);
});

test('a field of objects has no option: it goes in through --json only', async () => {
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '--people', 'Bob')).issues, [
    ['UNKNOWN_OPTION', 'people'],
  ]);
  const answer = await resultOf('echo', '--name', 'Ada', '--json', '{"people":[{"name":"Bob"}]}');
  assert.deepEqual(answer.result, { name: 'Ada', people: [{ name: 'Bob' }] });
});

test('a short option, a bare -- and every word after it are refused', async () => {
  assert.deepEqual((await issuesOf('echo', '--name', 'Ada', '-n', '--', '--x')).issues, [
    ['UNKNOWN_OPTION', 'n'],
    ['UNEXPECTED_ARGUMENT', '--'],
    ['UNEXPECTED_ARGUMENT', '--x'],
  ]);
});

test('an option before the command word is refused with the mistakes after it', async () => {
  const { exit, issues } = await issuesOf('--name', 'echo', '--nmae', 'Ada');
  assert.equal(exit, 1);
  assert.deepEqual(issues, [
    ['OPTION_BEFORE_COMMAND', 'name'],
    ['UNKNOWN_OPTION', 'nmae'],
  ]);
});

test('a mistake in the arguments stops the call before the schema is checked', async () => {
  // name is missing too, yet the schema runs only once the arguments passed
  assert.deepEqual((await issuesOf('echo', 'again')).issues, [['UNEXPECTED_ARGUMENT', 'again']]);
  assert.deepEqual((await issuesOf('echo')).issues, [['SCHEMA', 'name']]);
});
