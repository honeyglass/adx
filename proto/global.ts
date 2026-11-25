// `global` holds for every command, and one command can opt out or make a field optional.
import { z } from 'zod';
import { code, detailOf, global, id, keyOf, list, read as plain, tool } from '@honeyglass/adx';

const project = global({
  input: z.object({ project: id().describe('the project key') }),
  example: { project: 'checkout-web' },
});
// read, list and effect with the project typed into every handler
const { read } = project;
const noProject = code('NO_PROJECT', 'fix', 'Pass --project');

// Default: the global field is required and typed.
const labels = read({
  does: 'lists the labels of a project',
  run: ({ project }) => ({ project, upper: project.toUpperCase() }),
});
labels.step({ project: 'checkout-web' });

// `global: false`: the command takes no global field.
const whoami = read({
  does: 'names the signed-in user',
  global: false,
  // @ts-expect-error project is not an input of a command with global: false
  run: ({ project }) => ({ user: 'ada', project }),
});
read({
  does: 'x',
  global: false,
  // @ts-expect-error a refusal cannot point at a global field the command does not take
  run: (_, { refuse }) => refuse(noProject.at('project')),
});
whoami.invoke({});
// @ts-expect-error invoke takes no project for a command with global: false
whoami.invoke({ project: 'checkout-web' }, {});

// `{ project: 'optional' }`: the field may be left out, and `run` sees `string | undefined`.
const projects = read({
  does: 'lists the projects, or the one given',
  global: { project: 'optional' },
  run: ({ project }) => ({ only: project ?? 'all' }),
});
projects.invoke({});
read({
  does: 'x',
  global: { project: 'optional' },
  // @ts-expect-error project may be undefined here
  run: ({ project }) => ({ upper: project.toUpperCase() }),
});
read({
  does: 'x',
  global: { project: 'optional' },
  run: ({ project }, { refuse }) =>
    project === undefined ? refuse(noProject.at('project')) : { project },
});

// A typo in the global use does not compile.
read({
  does: 'x',
  // @ts-expect-error projekt is no global field
  global: { projekt: 'optional' },
  run: () => ({}),
});

// The tool takes the same global, and its table takes only commands built for it.
export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  global: project,
  commands: { labels, whoami, projects },
});

const version = plain({ does: 'x', run: () => ({ version: '1.2.0' }) });
tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'x',
  global: project,
  // @ts-expect-error a command built without the global cannot stand in a tool with one
  commands: { version },
});
tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'x',
  // @ts-expect-error a command built for a global needs a tool with that global
  commands: { labels },
});
// A global field goes to every kind of command, so it takes no name of an option adx gives one.
global({
  // @ts-expect-error a list has --page from adx, and a global field reaches every list
  input: z.object({ page: z.number() }),
  example: { page: 2 },
});
// @ts-expect-error a tool lists its commands
tool({ name: 'tracker', version: '1.2.0', does: 'x' });
// A global field takes every source but a key of a list: the list is made without the global.
const keys = list({
  does: 'lists the projects',
  item: z.object({ key: z.string() }),
  key: 'key',
  outline: ['key'],
  run: () => ({ items: [] }),
});
global({
  input: z.object({ project: z.string() }),
  example: { project: 'checkout-web' },
  values: { project: () => [{ value: 'checkout-web' }] },
});
global({
  input: z.object({ project: z.string() }),
  example: { project: 'checkout-web' },
  // @ts-expect-error a global field takes no key of a list
  values: { project: keyOf(keys) },
});
global({
  input: z.object({ project: z.string() }),
  example: { project: 'checkout-web' },
  // @ts-expect-error a global field takes no key of a list, nor the one-item command of one
  values: { project: detailOf(keys) },
});
