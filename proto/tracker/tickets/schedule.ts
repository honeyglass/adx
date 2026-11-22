import { z } from 'zod';
import { id, keyOf, needs } from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';
import { api, effect, Named } from '../core/tracker.ts';
import { tickets } from './list.ts';
import { show } from './show.ts';
import { Ticket } from './ticket.schema.ts';

const teams: Source<{ project: string }> = async ({ project }) => {
  if (project === undefined) return needs('project');
  const all = await api.get(['projects', project, 'teams'], Named);
  return all.map(t => ({ value: t.name, does: t.description }));
};

const milestones: Source<{ project: string; team: string }> = async ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  const path = ['projects', project, 'teams', team, 'milestones'];
  return (await api.get(path, Named)).map(m => ({ value: m.name }));
};

export const schedule = effect({
  does: 'puts a ticket into a milestone',
  input: z.object({
    id: id().describe('the ticket key'),
    team: z.string().describe('a team of the project'),
    milestone: z.string().describe('a milestone of the team'),
  }),
  example: { id: 'CW-112', team: 'web', milestone: 'q3' },
  values: { id: keyOf(tickets), team: teams, milestone: milestones },
  replace: false,
  plan: ({ id, team, milestone }) => ({ id, team, milestone }),
  apply: async ({ project, id, milestone }, { act }) => {
    const path = ['projects', project, 'tickets', id];
    const request = api.patch(path, { milestone });
    return { ticket: await act.send('the scheduled ticket', request, Ticket) };
  },
  look: ({ id }) => show.step({ id }),
});
