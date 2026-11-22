import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conformance, fake } from '@honeyglass/adx/test';
import { ship } from '../cli/ship.ts';
import { api } from '../core/server.ts';
import { draft } from '../releases/notes/draft.ts';
import { promote } from '../releases/promote.ts';

const app = '/apps/shop-web';
const staging = `${app}/envs/staging`;
const release = { id: 'r214', state: 'built', commit: '4f2a91c', author: 'ada', notes: '' };
const env = {
  name: 'staging',
  url: 'https://staging.shop.example.com',
  release: 'r213',
  previous: 'r212',
  frozen: false,
};
const variable = {
  key: 'PAYMENT_URL',
  value: '***',
  secret: true,
  updated: '2026-11-02T09:14:00Z',
};
const domain = { host: 'staging.shop.example.com', tls: 'ready' };

const routes = {
  'GET /user': { login: 'ada', active: true },
  'GET /status': { live: 4, frozen: 1 },
  'GET /apps': [{ key: 'shop-web', name: 'Shop', team: 'checkout' }],
  [`GET ${app}/status`]: { live: 2, frozen: 0 },
  [`GET ${app}/releases`]: { items: [release], total: 1 },
  [`GET ${app}/releases/r214`]: release,
  [`POST ${app}/releases`]: { ...release, id: 'r215' },
  [`GET ${app}/envs`]: [env],
  [`GET ${staging}`]: env,
  [`PUT ${staging}/release`]: { ...env, release: 'r214', previous: 'r213' },
  [`GET ${staging}/vars`]: [variable],
  [`GET ${staging}/vars/PAYMENT_URL`]: variable,
  [`PUT ${staging}/vars/PAYMENT_URL`]: variable,
  [`GET ${staging}/domains`]: [domain],
  [`POST ${staging}/domains`]: { host: 'beta.shop.example.com', tls: 'pending' },
};

const samples = {
  env: { SHIP_TOKEN: 'test-token' },
  fakes: [fake(api, routes)],
  seed: 'tests/seed', // holds the notes draft spring of shop-web
};

test('ship keeps the agent rules', t => conformance(t, ship, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/ship.ts'], samples));

test('a frozen environment stops a promotion', async () => {
  const frozen = fake(api, { ...routes, [`GET ${staging}`]: { ...env, frozen: true } });
  const input = { app: 'shop-web', release: 'r214', env: 'staging' };
  const answer = await promote.invoke(input, { ...samples, fakes: [frozen], dryRun: true });
  assert.equal(answer.kind, 'ask');
  assert.equal(answer.issues?.[0]?.code, 'ENV_FROZEN');
});

test('a taken draft name needs --replace', async () => {
  const input = { app: 'shop-web', name: 'spring', text: '- gift cards at checkout' };
  const refused = await draft.invoke(input, samples);
  assert.equal(refused.issues?.[0]?.code, 'ALREADY_EXISTS');
  const replaced = await draft.invoke(input, { ...samples, replace: true });
  assert.equal(replaced.result?.replaces, true);
});
