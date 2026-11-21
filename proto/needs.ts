// A source names every field that is surely missing, in one `needs`.
import { z } from 'zod';
import { id, needs, tool } from '@honeyglass/adx';

const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  global: {
    input: z.object({ project: id().describe('the project key') }),
    example: { project: 'checkout-web' },
  },
});

type Known = { project?: string; team?: string };
const choices = (names: string[]) => names.map(value => ({ value }));

// Both fields are surely missing: one answer names both.
const milestones = async ({ project, team }: Known) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  return choices([`${project}/${team}/m1`]);
};

// Whether the second field is needed depends on the first: name only what is surely missing.
const sprints = async ({ project, team }: Known) => {
  if (project === undefined) return needs('project');
  if (project === 'shop' && team === undefined) return needs('team');
  return choices(['s1']);
};

const input = z.object({
  team: id().describe('the team key'),
  milestone: z.string().describe('a milestone of the team'),
  sprint: z.string().describe('a sprint'),
});

tracker.effect({
  name: 'ticket schedule',
  does: 'puts a ticket into a milestone',
  input,
  example: { team: 'web', milestone: 'checkout-web/web/m1', sprint: 's1' },
  values: { milestone: milestones, sprint: sprints },
  plan: ({ project, team, milestone }) => ({ project, team, milestone }),
});

// A typo in needs does not compile where the source is used.
const typo = async ({ project }: Known) => (project === undefined ? needs('project', 'tema') : choices([]));
tracker.effect({
  name: 'ticket schedule typo',
  does: 'x',
  input,
  example: { team: 'web', milestone: 'm1', sprint: 's1' },
  // @ts-expect-error tema is no field of this command
  values: { milestone: typo },
  plan: () => ({}),
});

// needs without a field does not compile.
// @ts-expect-error needs takes at least one field
needs();
