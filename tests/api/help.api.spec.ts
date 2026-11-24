import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { global, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const project = global({
  input: z.object({ project: z.string().describe('the project key') }),
  example: { project: 'web' },
});

const add = project.effect({
  does: 'remembers a friend',
  input: z.object({
    name: z.string().describe("the friend's short name"),
    lang: z.string().default('en').describe('the language code'),
    tags: z.array(z.string()).optional(),
    people: z.array(z.object({ name: z.string() })).optional(),
  }),
  example: { name: 'ada' },
  plan: friend => friend,
});

const tracker = tool({
  name: 'tracker',
  version: '0.1.0',
  does: 'x',
  global: project,
  commands: { friends: { add, count: project.read({ does: 'counts friends', run: () => 0 }) } },
});

test('--help answers the fields, the options of adx and the example, and runs nothing', async () => {
  const { exit, out } = await run(tracker, ['friends', 'add', '--help']);
  assert.equal(exit, 0);
  assert.deepEqual(answerIn(out, z.unknown()).result, {
    command: 'tracker friends add',
    does: 'remembers a friend',
    fields: [
      {
        field: 'name',
        option: '--name',
        takes: 'text',
        does: "the friend's short name",
        required: true,
      },
      { field: 'lang', option: '--lang', takes: 'text', does: 'the language code', default: 'en' },
      { field: 'tags', option: '--tags', takes: 'text', repeats: true },
      { field: 'people', takes: 'json' },
      {
        field: 'project',
        option: '--project',
        takes: 'text',
        does: 'the project key',
        required: true,
      },
    ],
    options: [
      { option: '--json', takes: 'json', does: 'the whole input as one JSON object' },
      {
        option: '--output',
        takes: 'text',
        does: 'the form of the answer, text or json, in place of the one stdout picks',
      },
      { option: '--help', takes: 'switch', does: 'shows what the command takes' },
      { option: '--dry-run', takes: 'switch', does: 'runs plan only and changes nothing' },
      {
        option: '--replace',
        takes: 'switch',
        does: 'lets a write replace a file that holds other bytes',
      },
    ],
    // the example of the whole input, with the global fields of the global example
    example: { project: 'web', name: 'ada' },
  });
  // a command without a required field of its own has the global example as its own
  const count = await run(tracker, ['friends', 'count', '--help']);
  assert.deepEqual(
    z.object({ example: z.unknown() }).parse(answerIn(count.out, z.unknown()).result).example,
    { project: 'web' },
  );
});

test('--help at a terminal is text for people', async () => {
  const { out } = await run(tracker, ['friends', 'add', '--help'], { tty: true });
  assert.equal(
    out,
    [
      'tracker friends add: remembers a friend',
      '',
      "  --name <text>     the friend's short name; required",
      '  --lang <text>     the language code; default "en"',
      '  --tags <text>     again for more',
      '  people            only in --json',
      '  --project <text>  the project key; required',
      '  --json <json>     the whole input as one JSON object',
      '  --output <text>   the form of the answer, text or json, in place of the one stdout picks',
      '  --help            shows what the command takes',
      '  --dry-run         runs plan only and changes nothing',
      '  --replace         lets a write replace a file that holds other bytes',
      '',
      'example  {"project":"web","name":"ada"}',
      '',
    ].join('\n'),
  );
});

test('--help still refuses the mistakes of the call', async () => {
  const { exit, out } = await run(tracker, ['friends', 'add', '--help', '--nmae', 'x']);
  assert.equal(exit, 1);
  assert.deepEqual(
    answerIn(out, z.unknown()).issues?.map(i => i.code),
    ['UNKNOWN_OPTION'],
  );
});
