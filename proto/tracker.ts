// Guide, "Wrapping a remote API".
import { z } from 'zod';
import {
  bearer,
  code,
  detailOf,
  envUrl,
  id,
  keyOf,
  multiline,
  needs,
  remote,
  tool,
} from '@honeyglass/adx';

export const api = remote('tracker', {
  url: envUrl('TRACKER_URL', 'https://tracker.example.com/api'),
  auth: bearer('TRACKER_TOKEN'),
});

const Ticket = z.object({
  id: id().describe('the ticket key, such as CW-112'),
  title: z.string().describe('the one-line title'),
  state: z.enum(['open', 'closed']).describe('open or closed'),
  labels: z.array(z.string()).describe('the labels'),
  body: multiline().describe('the description, Markdown'),
});
const TicketPage = z.object({
  items: z.array(Ticket),
  next: z.string().optional(),
  total: z.number(),
});
const Named = z.array(z.object({ name: z.string(), description: z.string().default('') }));
const User = z.object({ login: z.string(), active: z.boolean() });
const Stats = z.object({ open: z.number(), closed: z.number() });

type Known = { project?: string; team?: string };

const projects = async () =>
  (await api.get(['projects'], Named)).map(p => ({
    value: p.name,
    does: p.description,
  }));

const labels = async ({ project }: Known) => {
  if (project === undefined) return needs('project');
  const all = await api.get(['projects', project, 'labels'], Named);
  return all.map(l => ({ value: l.name, does: l.description }));
};

const teams = async ({ project }: Known) => {
  if (project === undefined) return needs('project');
  const all = await api.get(['projects', project, 'teams'], Named);
  return all.map(t => ({ value: t.name, does: t.description }));
};

const milestones = async ({ project, team }: Known) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  const path = ['projects', project, 'teams', team, 'milestones'];
  return (await api.get(path, Named)).map(m => ({ value: m.name }));
};

export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  remotes: [api],
  global: {
    input: z.object({
      project: id().describe('the project key, such as checkout-web'),
    }),
    example: { project: 'checkout-web' },
    values: { project: projects },
  },
});

const noTicket = code('TICKET_NOT_FOUND', 'fix', 'Use a key the list command answers');
const inactive = code('USER_INACTIVE', 'ask', 'Ask an admin to activate the account');
const stillOpen = code('STILL_OPEN', 'retry', 'Look at the ticket, then close it again');

export const list = tracker.list({
  name: 'ticket list',
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

const show = tracker.read({
  name: 'ticket show',
  does: 'shows one ticket in full',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: detailOf(list) },
  output: Ticket,
  run: async ({ project, id }, { refuse }) => {
    const path = ['projects', project, 'tickets', id];
    const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
    return ticket ?? refuse(noTicket.at('id', `${project} has no ticket ${id}`));
  },
});

const CreateIn = z.object({
  title: z.string().describe('the one-line title'),
  body: multiline().default('').describe('the description, Markdown'),
  label: z.array(z.string()).default([]).describe('a label; may repeat'),
});

export const create = tracker.effect({
  name: 'ticket create',
  does: 'files a new ticket',
  input: CreateIn,
  example: { title: 'Pay button overlaps the footer', label: ['bug'] },
  values: { label: labels },
  replace: false,
  plan: ({ project, title, label }) => ({ project, title, labels: label }),
  apply: async ({ project, title, body, label }, { act }) => {
    const data = { title, body, labels: label };
    const request = api.post(['projects', project, 'tickets'], data);
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => list.step(),
  next: ({ ticket }) => [show.step({ id: ticket.id })],
});

const ScheduleIn = z.object({
  id: id().describe('the ticket key'),
  team: z.string().describe('a team of the project'),
  milestone: z.string().describe('a milestone of the team'),
});

export const schedule = tracker.effect({
  name: 'ticket schedule',
  does: 'puts a ticket into a milestone',
  input: ScheduleIn,
  example: { id: 'CW-112', team: 'web', milestone: 'q3' },
  values: { id: keyOf(list), team: teams, milestone: milestones },
  replace: false,
  plan: ({ id, team, milestone }) => ({ id, team, milestone }),
  apply: async ({ project, id, milestone }, { act }) => {
    const path = ['projects', project, 'tickets', id];
    const request = api.patch(path, { milestone });
    return { ticket: await act.send('the scheduled ticket', request, Ticket) };
  },
  look: ({ id }) => show.step({ id }),
});

export const whoami = tracker.read({
  name: 'whoami',
  does: 'names the signed-in user',
  global: false,
  run: async (_, { refuse }) => {
    const user = await api.get(['user'], User);
    return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
  },
});

tracker.read({
  name: 'stats',
  does: 'counts the tickets of one project, or of all',
  global: { project: 'optional' },
  run: ({ project }) => {
    const path = project === undefined ? ['stats'] : ['projects', project, 'stats'];
    return api.get(path, Stats);
  },
});

// Not in the guide: a refusal from apply, for a server that says no. It concerns no field.
tracker.effect({
  name: 'ticket close',
  does: 'closes one ticket',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: keyOf(list) },
  replace: false,
  plan: ({ id }) => ({ id, state: 'closed' as const }),
  apply: async ({ project, id }, { act, refuse }) => {
    const request = api.patch(['projects', project, 'tickets', id], { state: 'closed' });
    const ticket = await act.send('the closed ticket', request, Ticket);
    return ticket.state === 'closed' ? { ticket } : refuse(stillOpen.issue(`${id} is still open`));
  },
  look: ({ id }) => show.step({ id }),
});

tracker.start(() => [list.step()]);

// ---- what must NOT compile ----
tracker.read({
  name: 'bad find',
  does: 'x',
  input: z.object({ id: id() }),
  example: { id: 'CW-112' },
  values: { id: keyOf(list) },
  // @ts-expect-error api.find is gone: get with on answers undefined for a 404
  run: ({ project, id }) => api.find(['projects', project, 'tickets', id], Ticket),
});
tracker.read({
  name: 'bad query',
  does: 'x',
  // @ts-expect-error the query stands in the options: { query: { state } }
  run: ({ project }) => api.get(['projects', project, 'tickets'], TicketPage, { state: 'open' }),
});
tracker.effect({
  name: 'bad act',
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  // @ts-expect-error act has no write: files are staged in plan only
  apply: ({ project }, { act }) => ({ file: act.write(project) }),
  look: () => list.step(),
});
tracker.effect({
  name: 'bad text',
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  apply: async ({ project }, { act }) => {
    const request = api.post(['projects', project, 'tickets'], {});
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => list.step(),
  // @ts-expect-error a dry run answers the plan only, so ticket may be missing
  text: out => out.ticket.id,
});
tracker.effect({
  name: 'bad apply',
  does: 'x',
  replace: false,
  plan: ({ project }) => ({ project }),
  // @ts-expect-error apply returns an object, which adx merges into the plan
  apply: () => 5,
  look: () => list.step(),
});
tracker.read({
  name: 'bad output',
  does: 'x',
  output: Ticket,
  // @ts-expect-error run must answer what output declares
  run: () => ({ id: 'CW-112' }),
});
const answer = await create.invoke({ project: 'checkout-web', title: 'x' }, { dryRun: true });
// @ts-expect-error a refusal carries issues only; needs stands in a step of next
void answer.needs;

if (import.meta.main) await tracker.main();
