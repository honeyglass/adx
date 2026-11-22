import { z } from 'zod';
import { multiline, needs } from '@honeyglass/adx';
import { api, effect, Named } from '../core/tracker.ts';
import { tickets } from './list.ts';
import { show } from './show.ts';
import { Ticket } from './ticket.schema.ts';

export const create = effect({
  does: 'files a new ticket',
  input: z.object({
    title: z.string().describe('the one-line title'),
    body: multiline().default('').describe('the description, Markdown'),
    label: z.array(z.string()).default([]).describe('a label; may repeat'),
  }),
  example: { title: 'Pay button overlaps the footer', label: ['bug'] },
  values: {
    label: async ({ project }) => {
      if (project === undefined) return needs('project');
      const all = await api.get(['projects', project, 'labels'], Named);
      return all.map(l => ({ value: l.name, does: l.description }));
    },
  },
  replace: false,
  plan: ({ project, title, label }) => ({ project, title, labels: label }),
  apply: async ({ project, title, body, label }, { act }) => {
    const data = { title, body, labels: label };
    const request = api.post(['projects', project, 'tickets'], data);
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => tickets.step(),
  next: ({ ticket }) => [show.step({ id: ticket.id })],
});
