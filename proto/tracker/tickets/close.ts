// Guide, "Errors you did not map": a refusal from apply, for a server that says no. It concerns
// no field. The status is an error the command expects, so it takes it with $try, not in a try block.
import { z } from 'zod';
import { code, id, keyOf, status } from '@honeyglass/adx';
import { $try } from '@honeyglass/utils/ts';
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
    const sent = await $try(act.send('the closed ticket', request, Ticket));
    if (sent.error === null) return { ticket: sent.data };
    // The server answers 409 while someone else works on the ticket. Any other error flies on.
    if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
    throw sent.error;
  },
  look: ({ id }) => show.step({ id }),
});
