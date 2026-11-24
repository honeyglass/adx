import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { global, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const project = global({
  input: z.object({ project: z.string().describe('the project key') }),
  example: { project: 'checkout-web' },
});

const labels = project.read({
  does: 'lists the labels of a project',
  input: z.object({ team: z.string().optional() }),
  run: ({ project, team }) => ({ project, team }),
});

const whoami = project.read({
  does: 'names the signed-in user',
  global: false,
  run: () => ({ user: 'ada' }),
});

const projects = project.list({
  does: 'lists the projects, or the one given',
  global: { project: 'optional' },
  item: z.object({ key: z.string() }),
  key: 'key',
  outline: [],
  run: ({ project }) => ({ items: [{ key: project ?? 'all' }] }),
});

const create = project.effect({
  does: 'creates a ticket',
  input: z.object({ title: z.string() }),
  example: { title: 'Fix it' },
  plan: ({ project, title }) => ({ project, title }),
});

const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  global: project,
  commands: { labels, whoami, projects, ticket: { create } },
});

const answerOf = async (...argv: string[]) => answerIn((await run(tracker, argv)).out, z.unknown());

test('every kind of command takes the global fields beside its own', async () => {
  const labelled = await answerOf('labels', '--project', 'web', '--team', 'core');
  assert.deepEqual(labelled.result, { project: 'web', team: 'core' });
  const created = await answerOf('ticket', 'create', '--title', 'Fix', '--project', 'web');
  assert.deepEqual(created.result, { project: 'web', title: 'Fix' });
});

test('a global field is required unless the command makes it optional', async () => {
  assert.deepEqual(
    (await answerOf('labels')).issues?.map(i => [i.code, i.path]),
    [['SCHEMA', 'project']],
  );
  assert.deepEqual((await answerOf('projects')).result, { items: [{ key: 'all' }] });
  assert.deepEqual((await answerOf('projects', '--project', 'web')).result, {
    items: [{ key: 'web' }],
  });
});

test('a command with global: false refuses the global option', async () => {
  assert.deepEqual((await answerOf('whoami')).result, { user: 'ada' });
  assert.deepEqual(
    (await answerOf('whoami', '--project', 'web')).issues?.map(i => [i.code, i.path]),
    [['UNKNOWN_OPTION', 'project']],
  );
});

test('invoke takes the global fields in the input', async () => {
  assert.deepEqual(await labels.invoke({ project: 'web' }), {
    ok: true,
    result: { project: 'web', team: undefined },
  });
});

test('global hands out its input', () => {
  assert.deepEqual(Object.keys(project.input.shape), ['project']);
});

test('a field of a command that the global input also has is a DECLARATION error', async () => {
  const twice = tool({
    name: 'twice',
    version: '1.2.0',
    does: 'x',
    global: project,
    commands: {
      // a JavaScript caller passes what the type checker refuses
      show: project.read({ does: 'x', input: z.object({ project: z.number() }), run: () => ({}) }),
    },
  });
  const { exit, out } = await run(twice, ['show', '--project', 'web']);
  assert.deepEqual(
    [exit, answerIn(out, z.unknown()).issues?.map(i => i.code)],
    [2, ['DECLARATION']],
  );
});
