// `global` holds for every command, and one command can opt out or make a field optional.
import { z } from 'zod';
import { code, id, tool } from '@honeyglass/adx';

const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  global: {
    input: z.object({ project: id().describe('the project key') }),
    example: { project: 'checkout-web' },
  },
});
const noProject = code('NO_PROJECT', 'fix', 'Pass --project');

// Default: the global field is required and typed.
const labels = tracker.read({
  name: 'labels',
  does: 'lists the labels of a project',
  run: ({ project }) => ({ project, upper: project.toUpperCase() }),
});
labels.step({ project: 'checkout-web' });

// `global: false`: the command takes no global field.
const whoami = tracker.read({
  name: 'whoami',
  does: 'names the signed-in user',
  global: false,
  // @ts-expect-error project is not an input of a command with global: false
  run: ({ project }) => ({ user: 'ada', project }),
});
tracker.read({
  name: 'whoami refuse',
  does: 'x',
  global: false,
  // @ts-expect-error a refusal cannot point at a global field the command does not take
  run: (_, { refuse }) => refuse(noProject.at('project')),
});
whoami.invoke({});
// @ts-expect-error invoke takes no project for a command with global: false
whoami.invoke({ project: 'checkout-web' }, {});

// `{ project: 'optional' }`: the field may be left out, and `run` sees `string | undefined`.
const projects = tracker.read({
  name: 'projects',
  does: 'lists the projects, or the one given',
  global: { project: 'optional' },
  run: ({ project }) => ({ only: project ?? 'all' }),
});
projects.invoke({});
tracker.read({
  name: 'projects strict',
  does: 'x',
  global: { project: 'optional' },
  // @ts-expect-error project may be undefined here
  run: ({ project }) => ({ upper: project.toUpperCase() }),
});
tracker.read({
  name: 'projects refuse',
  does: 'x',
  global: { project: 'optional' },
  run: ({ project }, { refuse }) => (project === undefined ? refuse(noProject.at('project')) : { project }),
});

// A typo in the global use does not compile.
tracker.read({
  name: 'typo',
  does: 'x',
  // @ts-expect-error projekt is no global field
  global: { projekt: 'optional' },
  run: () => ({}),
});
