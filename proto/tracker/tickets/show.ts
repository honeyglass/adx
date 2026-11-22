import { z } from 'zod';
import { code, detailOf, id } from '@honeyglass/adx';
import { api, read } from '../core/tracker.ts';
import { tickets } from './list.ts';
import { Ticket } from './ticket.schema.ts';

const noTicket = code('TICKET_NOT_FOUND', 'fix', 'Use a key the list command answers');

export const show = read({
  does: 'shows one ticket in full',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: detailOf(tickets) },
  output: Ticket,
  run: async ({ project, id }, { refuse }) => {
    const path = ['projects', project, 'tickets', id];
    const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
    return ticket ?? refuse(noTicket.at('id', `${project} has no ticket ${id}`));
  },
});
