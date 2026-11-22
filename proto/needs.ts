// A source names every field that is surely missing, in one `needs`.
import { z } from 'zod';
import { global, id, needs, tool } from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';

const project = global({
  input: z.object({ project: id().describe('the project key') }),
  example: { project: 'checkout-web' },
});
const { effect } = project;

const choices = (names: string[]) => names.map(value => ({ value }));

// A named source says which fields it reads, with the type `Source`.
type Fields = { project: string; team: string };

// Both fields are surely missing: one answer names both.
const milestones: Source<Fields> = async ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  return choices([`${project}/${team}/m1`]);
};

// Whether the second field is needed depends on the first: name only what is surely missing.
const sprints: Source<Fields> = async ({ project, team }) => {
  if (project === undefined) return needs('project');
  if (project === 'shop' && team === undefined) return needs('team');
  return choices(['s1']);
};

const input = z.object({
  team: id().describe('the team key'),
  milestone: z.string().describe('a milestone of the team'),
  sprint: z.string().describe('a sprint'),
});

const schedule = effect({
  does: 'puts a ticket into a milestone',
  input,
  example: { team: 'web', milestone: 'checkout-web/web/m1', sprint: 's1' },
  values: {
    team: () => choices(['web']),
    milestone: milestones,
    sprint: sprints,
  },
  plan: ({ project, team, milestone }) => ({ project, team, milestone }),
});

export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  global: project,
  commands: { ticket: { schedule } },
});

// A typo in needs of a named source does not compile, and the error stands at the source.
const typo: Source<Fields> = async ({ project }) =>
  // @ts-expect-error tema is no field the source reads
  project === undefined ? needs('project', 'tema') : choices([]);

// A source written in `values` gets its fields from the command, and a typo stands at its line.
effect({
  does: 'x',
  input,
  example: { team: 'web', milestone: 'm1', sprint: 's1' },
  values: {
    team: () => choices(['web']),
    // @ts-expect-error tema is no field of this command
    milestone: ({ project }) => (project === undefined ? needs('project', 'tema') : choices([])),
  },
  plan: () => ({}),
});

// A source that reads a field the command does not have does not compile where it is used.
const other: Source<{ region: string }> = ({ region }) =>
  region === undefined ? needs('region') : choices([]);
effect({
  does: 'x',
  input,
  example: { team: 'web', milestone: 'm1', sprint: 's1' },
  // @ts-expect-error region is no field of this command
  values: { team: () => choices(['web']), milestone: other },
  plan: () => ({}),
});

// needs without a field does not compile.
// @ts-expect-error needs takes at least one field
needs();

export { typo };
