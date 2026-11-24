// proto/ship as the program bin/ship.ts against a local server, with the answers of its README.
import assert from 'node:assert/strict';
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { PROTO, program, scratch } from '../utils/program.ts';
import type { Call } from '../utils/program.ts';
import { serve } from '../utils/server.ts';
import type { Routes } from '../utils/server.ts';

const SHIP = join(PROTO, 'ship', 'bin', 'ship.ts');

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

// The routes of proto/ship/tests/ship.test.ts that the calls below reach.
const ROUTES: Routes = {
  'GET /user': { login: 'ada', active: true },
  'GET /apps': [{ key: 'shop-web', name: 'Shop', team: 'checkout' }],
  [`GET ${app}/releases`]: { items: [release], total: 1 },
  [`GET ${app}/releases/r214`]: release,
  [`GET ${app}/envs`]: [env],
  [`GET ${staging}`]: env,
};

// A call against a server of the routes, its data folder holding the draft spring of shop-web.
async function callWith(t: TestContext, routes: Routes): Promise<Call> {
  const home = await scratch(t);
  await cp(join(PROTO, 'ship', 'tests', 'seed'), join(home, '.ship'), { recursive: true });
  const url = await serve(t, routes);
  return { home, env: { SHIP_URL: url, SHIP_TOKEN: 'test-token' } };
}

const ship = (call: Call, ...argv: string[]) => program(SHIP, argv, call);

test('called alone, names the two lists to begin with', async t => {
  const call = await callWith(t, ROUTES);
  const { exit, out } = await ship(call);
  assert.equal(exit, 0);
  assert.deepEqual(
    answerIn(out, z.unknown()).next?.map(step => step.command),
    ['ship app list', 'ship release list'],
  );
});

test('a mistyped command exits with 1', async t => {
  const call = await callWith(t, ROUTES);
  const { exit, out } = await ship(call, 'relase', 'list', '--app', 'shop-web');
  assert.equal(exit, 1);
  assert.equal(answerIn(out, z.unknown()).issues?.[0]?.code, 'UNKNOWN_COMMAND');
});

test('a frozen environment stops a promotion', async t => {
  const call = await callWith(t, { ...ROUTES, [`GET ${staging}`]: { ...env, frozen: true } });
  const promote = ['release', 'promote', '--app', 'shop-web', '--release', 'r214'];
  const { exit, out } = await ship(call, ...promote, '--env', 'staging', '--dry-run');
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.equal(answer.kind, 'ask');
  assert.equal(answer.issues?.[0]?.code, 'ENV_FROZEN');
  // the hint of cli/hints.ts: releases/ refuses, and the command lies in env/
  assert.match(answer.issues?.[0]?.command ?? '', /^ship env list --app shop-web/);
});

test('a taken draft name needs --replace', async t => {
  const call = await callWith(t, ROUTES);
  const draft = ['release', 'notes', 'draft', '--app', 'shop-web', '--name', 'spring'];
  // a value that starts with a dash goes in the --name=value form
  const text = ['--text=- gift cards at checkout'];
  const refused = await ship(call, ...draft, ...text);
  assert.equal(refused.exit, 1);
  assert.equal(answerIn(refused.out, z.unknown()).issues?.[0]?.code, 'ALREADY_EXISTS');
  const replaced = await ship(call, ...draft, ...text, '--replace');
  const Written = z.object({ replaces: z.boolean() });
  assert.equal(replaced.exit, 0);
  assert.equal(answerIn(replaced.out, Written).result?.replaces, true);
});
