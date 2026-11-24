/**
 * What must and must not compile with the built read, list, effect, global and tool.
 *
 * The typecheck reads this file, and nothing runs it. proto/global.ts and proto/hello2.types.ts
 * hold the same cases, but they import values a later part of adx builds, so they cannot yet
 * compile against dist/.
 *
 * @example pnpm run typecheck
 */
import { z } from 'zod';
import { code, effect, global, list, read, tool } from '@honeyglass/adx';

const project = global({
  input: z.object({ project: z.string() }),
  example: { project: 'checkout-web' },
});
const noProject = code('NO_PROJECT', 'fix', 'Pass --project');
const Item = z.object({ code: z.string(), name: z.string() });

// The global field is typed into the handler of every kind.
const labels = project.read({
  does: 'x',
  run: ({ project }) => ({ upper: project.toUpperCase() }),
});
project.list({
  does: 'x',
  item: Item,
  key: 'code',
  outline: ['name'],
  run: ({ project }) => ({ items: [{ code: project, name: project }] }),
});
project.effect({ does: 'x', plan: ({ project }) => ({ project }) });

// `global: false`: the command takes no global field.
const whoami = project.read({
  does: 'x',
  global: false,
  // @ts-expect-error project is not an input of a command with global: false
  run: ({ project }) => ({ project }),
});
project.read({
  does: 'x',
  global: false,
  // @ts-expect-error a refusal cannot point at a global field the command does not take
  run: (_, { refuse }) => refuse(noProject.at('project')),
});
// @ts-expect-error invoke takes no project for a command with global: false
void whoami.invoke({ project: 'checkout-web' }, {});

// `{ project: 'optional' }`: run sees string | undefined.
const projects = project.read({
  does: 'x',
  global: { project: 'optional' },
  run: ({ project }) => ({ only: project ?? 'all' }),
});
void projects.invoke({});
project.read({
  does: 'x',
  global: { project: 'optional' },
  // @ts-expect-error project may be undefined here
  run: ({ project }) => ({ upper: project.toUpperCase() }),
});
project.read({
  does: 'x',
  // @ts-expect-error projekt is no global field
  global: { projekt: 'optional' },
  run: () => ({}),
});

// The tool takes the same global, and its table takes only commands built for it.
tool({ name: 't', version: '1', does: 'x', global: project, commands: { labels, whoami } });
const version = read({ does: 'x', run: () => ({ version: '1' }) });
// @ts-expect-error a command built without the global cannot stand in a tool with one
tool({ name: 't', version: '1', does: 'x', global: project, commands: { version } });
// @ts-expect-error a command built for a global needs a tool with that global
tool({ name: 't', version: '1', does: 'x', commands: { labels } });
// @ts-expect-error a tool lists its commands
tool({ name: 't', version: '1', does: 'x' });

// A field named like an option adx gives the command does not compile.
list({
  does: 'x',
  // @ts-expect-error a list has --page from adx
  input: z.object({ page: z.number() }),
  item: Item,
  key: 'code',
  outline: ['name'],
  run: () => ({ items: [] }),
});
read({
  does: 'x',
  // @ts-expect-error a read with output has --fields from adx
  input: z.object({ fields: z.string() }),
  output: Item,
  run: () => ({ code: 'de', name: 'German' }),
});
effect({
  does: 'x',
  // @ts-expect-error every effect has --dry-run from adx
  input: z.object({ dryRun: z.boolean() }),
  plan: () => ({}),
});
read({
  does: 'x',
  // @ts-expect-error every command has --help from adx
  input: z.object({ help: z.string() }),
  run: ({ help }) => ({ help }),
});
global({
  // @ts-expect-error a global field reaches every list, which has --page from adx
  input: z.object({ page: z.number() }),
  example: { page: 2 },
});
// An effect has no --page, no command has --version, and a read without output has no --fields.
effect({
  does: 'x',
  input: z.object({ page: z.number(), version: z.string() }),
  plan: ({ page, version }) => ({ page, version }),
});
read({ does: 'x', input: z.object({ fields: z.string() }), run: ({ fields }) => ({ fields }) });

// A list's key and outline name fields of its item.
list({
  does: 'x',
  item: Item,
  // @ts-expect-error key is no field of the item
  key: 'kode',
  outline: ['name'],
  run: () => ({ items: [] }),
});

// With output, run answers what the schema declares, and the real run of an effect adds apply.
read({
  does: 'x',
  output: Item,
  // @ts-expect-error name is missing from the answer
  run: () => ({ code: 'de' }),
});
const sent = effect({
  does: 'x',
  plan: () => ({ planned: 1 }),
  apply: (_, { planned }) => ({ sent: planned.planned }),
});
export const answered: Promise<{ result?: { planned: number; sent?: number } }> = sent.invoke({});
