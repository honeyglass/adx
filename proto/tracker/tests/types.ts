// What must NOT compile in tracker.
import { after } from '@honeyglass/adx';
import { api, effect, read } from '../core/tracker.ts';
import { create } from '../tickets/create.ts';
import { tickets } from '../tickets/list.ts';
import { Ticket } from '../tickets/ticket.schema.ts';
import { whoami } from '../user/whoami.ts';

read({
  does: 'x',
  // @ts-expect-error api.find is gone: get with on answers undefined for a 404
  run: ({ project }) => api.find(['projects', project, 'tickets', 'CW-112'], Ticket),
});
read({
  does: 'x',
  // @ts-expect-error the query stands in the options: { query: { state } }
  run: ({ project }) => api.get(['projects', project, 'tickets'], Ticket, { state: 'open' }),
});
effect({
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  // @ts-expect-error act has no write: files are staged in plan only
  apply: ({ project }, { act }) => ({ file: act.write(project) }),
  look: () => tickets.step(),
});
effect({
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  apply: async ({ project }, { act }) => {
    const request = api.post(['projects', project, 'tickets'], {});
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => tickets.step(),
  // @ts-expect-error a dry run answers the plan only, so ticket may be missing
  text: out => out.ticket.id,
});
effect({
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  // @ts-expect-error apply returns an object, which adx merges into the plan
  apply: () => 5,
  look: () => tickets.step(),
});
read({
  does: 'x',
  output: Ticket,
  // @ts-expect-error run must answer what output declares
  run: () => ({ id: 'CW-112' }),
});
const answer = await create.invoke({ project: 'checkout-web', title: 'x' }, { dryRun: true });
// @ts-expect-error a refusal carries issues only; needs stands in a step of next
void answer.needs;

// A step across folders: `after` gets the answer of the real run and the input of the command.
after(create, ({ ticket }, { project }) => [tickets.step({ project, state: ticket.state })]);
// @ts-expect-error tikcet is no field of the answer of create
after(create, ({ tikcet }) => [tickets.step({ state: tikcet })]);
// @ts-expect-error whoami takes no project
after(whoami, (_, { project }) => [tickets.step({ project })]);
