import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conformance, fake, reply } from '@honeyglass/adx/test';
import { tracker } from '../cli/tracker.ts';
import { api } from '../core/tracker.ts';
import { create } from '../tickets/create.ts';
import { tickets } from '../tickets/list.ts';

const ticket = {
  id: 'CW-112',
  title: 'Totals round twice',
  state: 'open',
  labels: ['bug'],
  body: '',
};
const project = '/projects/checkout-web';

const routes = {
  'GET /user': { login: 'ada', active: true },
  'GET /stats': { open: 73, closed: 412 },
  [`GET ${project}/stats`]: { open: 73, closed: 412 },
  'GET /projects': [{ name: 'checkout-web' }],
  [`GET ${project}/labels`]: [{ name: 'bug' }, { name: 'payments' }],
  [`GET ${project}/teams`]: [{ name: 'web' }],
  [`GET ${project}/teams/web/milestones`]: [{ name: 'q3' }],
  [`GET ${project}/tickets`]: { items: [ticket], total: 1 },
  [`GET ${project}/tickets/CW-112`]: ticket,
  [`POST ${project}/tickets`]: { ...ticket, id: 'CW-132' },
  [`PATCH ${project}/tickets/CW-112`]: { ...ticket, state: 'closed' },
};

const samples = {
  env: { TRACKER_TOKEN: 'test-token' },
  fakes: [fake(api, routes)],
};

test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/tracker.ts'], samples));

test('a busy server is a retry', async () => {
  const busy = fake(api, { [`GET ${project}/tickets`]: reply(503) });
  const options = { ...samples, fakes: [busy] };
  const answer = await tickets.invoke({ project: 'checkout-web' }, options);
  assert.equal(answer.kind, 'retry');
  assert.equal(answer.issues?.[0]?.code, 'SERVER_BUSY');
  assert.equal(answer.state, 'Nothing was changed.');
});

test('the real run answers the plan and the ticket', async () => {
  const input = { project: 'checkout-web', title: 'Totals round twice' };
  const dry = await create.invoke(input, { ...samples, dryRun: true });
  assert.equal(dry.result?.ticket, undefined);
  const real = await create.invoke(input, samples);
  assert.equal(real.result?.title, dry.result?.title);
  assert.equal(real.result?.ticket?.id, 'CW-132');
});
