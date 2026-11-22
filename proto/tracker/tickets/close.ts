// Not in the guide: a refusal from apply, for a server that says no. It concerns no field.
import { z } from 'zod';
import { code, id, keyOf } from '@honeyglass/adx';
import { api, effect } from '../core/tracker.ts';
import { tickets } from './list.ts';
import { show } from './show.ts';
import { Ticket } from './ticket.schema.ts';

const stillOpen = code('STILL_OPEN', 'retry', 'Look at the ticket, then close it again');

export const close = effect({
  does: 'closes one ticket',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: keyOf(tickets) },
  replace: false,
  plan: ({ id }) => ({ id, state: 'closed' as const }),
  apply: async ({ project, id }, { act, refuse }) => {
    const request = api.patch(['projects', project, 'tickets', id], { state: 'closed' });
    const ticket = await act.send('the closed ticket', request, Ticket);
    return ticket.state === 'closed' ? { ticket } : refuse(stillOpen.issue(`${id} is still open`));
  },
  look: ({ id }) => show.step({ id }),
});
