import { z } from 'zod';
import { api, list } from '../core/tracker.ts';
import { Ticket } from './ticket.schema.ts';

const TicketPage = z.object({
  items: z.array(Ticket),
  next: z.string().optional(),
  total: z.number(),
});

export const tickets = list({
  does: 'lists the tickets of a project',
  input: z.object({
    state: z.enum(['open', 'closed']).default('open').describe('open or closed'),
  }),
  item: Ticket,
  key: 'id',
  outline: ['title', 'state'],
  run: ({ project, state }, { page }) => {
    const query = { state, cursor: page.cursor, limit: page.size };
    return api.get(['projects', project, 'tickets'], TicketPage, { query });
  },
});
