import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { z } from 'zod';
import { $try } from '@honeyglass/utils/ts';
import {
  bearer,
  code,
  cwd,
  effect,
  envUrl,
  failed,
  hint,
  needs,
  read,
  remote,
  root,
  status,
  tool,
} from '@honeyglass/adx';
import { fake, reply, run } from '@honeyglass/adx/test';
import { heard } from '../../dist/remote/index.js';
import { answerIn } from '../utils/answer.ts';
import { listen } from '../utils/server.ts';

const api = remote('shop', {
  url: envUrl('SHOP_URL', 'https://shop.example.com/api'),
  auth: bearer('SHOP_TOKEN'),
});

const Item = z.object({ id: z.string(), name: z.string() });

const noItem = code('ITEM_NOT_FOUND', 'fix', 'Use an id the shop knows');
const stillOpen = code('STILL_OPEN', 'fix', 'Wait until the item is free');

const show = read({
  does: 'shows one item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  run: async ({ id }, { refuse }) => {
    const item = await api.get(['items', id], Item, { on: { 404: undefined } });
    return item ?? refuse(noItem.at('id', `the shop has no item ${id}`));
  },
});

const search = read({
  does: 'finds items',
  input: z.object({ q: z.string() }),
  example: { q: 'pen' },
  run: ({ q }) => api.get(['items'], z.array(Item), { query: { q, limit: 5, cursor: undefined } }),
});

const create = effect({
  does: 'adds an item',
  input: z.object({ name: z.string() }),
  example: { name: 'pen' },
  replace: false,
  plan: ({ name }) => ({ name }),
  apply: async ({ name }, { act }) => ({
    item: await act.send('the new item', api.post(['items'], { name }), Item),
  }),
  look: ({ name }) => search.step({ q: name }),
});

const close = effect({
  does: 'closes an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  replace: false,
  plan: ({ id }) => ({ id }),
  apply: async ({ id }, { act, refuse }) => {
    await act.send('the note', api.post(['items', id, 'notes'], { text: 'closing' }), z.unknown());
    const request = api.patch(['items', id], { state: 'closed' });
    const sent = await $try(act.send('the closed item', request, Item));
    if (sent.error === null) return { item: sent.data };
    if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
    throw sent.error;
  },
  look: ({ id }) => show.step({ id }),
});

const pick = read({
  does: 'picks an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  values: {
    id: async () => (await api.get(['ids'], z.array(z.string()))).map(value => ({ value })),
  },
  run: ({ id }) => ({ id }),
});

const move = read({
  does: 'moves an item to a slot',
  input: z.object({ shelf: z.string().optional(), slot: z.string() }),
  example: { shelf: 'top', slot: 's1' },
  values: {
    shelf: async () => (await api.get(['shelves'], z.array(z.string()))).map(value => ({ value })),
    slot: ({ shelf }) => (shelf === undefined ? needs('shelf') : [{ value: 's1' }]),
  },
  run: ({ slot }) => ({ slot }),
});

const work = root('work', cwd);

const stock = effect({
  does: 'stocks an item and tells the shop',
  input: z.object({ name: z.string() }),
  example: { name: 'pen' },
  plan: ({ name }, { files }) => files.write(work.file(`${name}.json`), '{}'),
  apply: async ({ name }, { act }) => ({
    item: await act.send('the stock', api.post(['items'], { name }), Item),
  }),
  look: ({ name }) => search.step({ q: name }),
});

const migrate = effect({
  does: 'migrates the shop',
  replace: false,
  plan: () => ({}),
  apply: async (_, { act }) => {
    await act.send('the note', api.post(['notes'], { text: 'migrating' }), z.unknown());
    throw failed('The migration ran up to step 3.', new Error('step 4 broke'));
  },
  look: () => search.step({ q: 'migration' }),
});

const reserve = effect({
  does: 'reserves an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  replace: false,
  plan: ({ id }) => ({ id }),
  apply: (_, { refuse }) => refuse(noItem.at('id')),
  look: ({ id }) => show.step({ id }),
});

const weigh = effect({
  does: 'weighs an item',
  replace: false,
  plan: () => ({}),
  apply: async (_, { act }) => {
    const sent = await $try(act.send('the weight', api.post(['weights'], {}), z.unknown()));
    return { status: status(sent.error) ?? null };
  },
  look: () => search.step({ q: 'weight' }),
});

const shop = tool({
  name: 'shop',
  version: '1.0.0',
  does: 'sells things',
  roots: [work],
  remotes: [api],
  commands: { show, search, create, close, pick, move, stock, migrate, reserve, weigh },
  hints: [hint(noItem, () => pick.step().carry('id'))],
});

const item = { id: 'a1', name: 'pen' };

type Seen = { method: string; url: string; auth: string | undefined; type: string | undefined };
/** 'drop' closes the connection, 'garbage' answers bytes that are no HTTP. */
type Reply =
  { status: number; body?: unknown; raw?: string; location?: string } | 'drop' | 'garbage';

/** A shop at /api on a local server, which answers each request by its number, from 1. */
async function server(t: TestContext, answer: (seen: Seen, count: number) => Reply) {
  const seen: (Seen & { body: string })[] = [];
  const url = await listen(t, async (request, response) => {
    const body = await text(request);
    const { authorization: auth, 'content-type': type } = request.headers;
    const one = { method: request.method ?? '', url: request.url ?? '', auth, type };
    seen.push({ ...one, body });
    const answered = answer(one, seen.length);
    if (answered === 'drop') return void request.socket.destroy();
    if (answered === 'garbage') return void request.socket.end('no http at all\r\n\r\n');
    const headers = answered.location === undefined ? {} : { location: answered.location };
    response.writeHead(answered.status, { 'content-type': 'application/json', ...headers });
    const json = answered.body === undefined ? '' : JSON.stringify(answered.body);
    response.end(answered.raw ?? json);
  });
  return { env: { SHOP_URL: `${url}/api`, SHOP_TOKEN: 'tok' }, seen };
}

async function answerOf(argv: string[], options: Parameters<typeof run>[2]) {
  const { exit, out } = await run(shop, argv, options);
  return { exit, ...answerIn(out, z.unknown()) };
}

const codesOf = (answer: { issues?: { code: string }[] }) => answer.issues?.map(i => i.code);

test('get reads through the remote with the token, and answers what passed the schema', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: { ...item, extra: 1 } }));
  const answer = await answerOf(['show', '--id', 'a1'], { env });
  assert.deepEqual(answer.result, item);
  assert.deepEqual(seen, [
    { method: 'GET', url: '/api/items/a1', auth: 'Bearer tok', type: undefined, body: '' },
  ]);
});

test('each part of a path is encoded, and a query leaves out what is undefined', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: [] }));
  await answerOf(['search', '--q', 'a b&c=d'], { env });
  await answerOf(['show', '--id', 'x/y?z#w'], { env });
  assert.deepEqual(
    seen.map(one => one.url),
    ['/api/items?q=a%20b%26c%3Dd&limit=5', '/api/items/x%2Fy%3Fz%23w'],
  );
});

test('a status named in on answers its value, and any other is refused by its kind', async t => {
  const statuses = new Map([
    ['/api/items/gone', 404],
    ['/api/items/locked', 401],
    ['/api/items/broken', 500],
  ]);
  const { env, seen } = await server(t, ({ url }) => ({ status: statuses.get(url) ?? 200 }));
  const gone = await answerOf(['show', '--id', 'gone'], { env });
  const locked = await answerOf(['show', '--id', 'locked'], { env });
  const broken = await answerOf(['show', '--id', 'broken'], { env });
  assert.deepEqual([gone.kind, codesOf(gone)], ['fix', ['ITEM_NOT_FOUND']]);
  assert.deepEqual([locked.exit, locked.kind, codesOf(locked)], [1, 'ask', ['ACCESS_REFUSED']]);
  assert.deepEqual([broken.kind, codesOf(broken)], ['ask', ['REMOTE_REFUSED']]);
  assert.equal(broken.state, 'Nothing was changed.');
  // a 500 is not tried again
  assert.equal(seen.length, 3);
});

test('a read is tried again up to 3 times on a 503, a 429 or a network error', async t => {
  const replies: Reply[] = [{ status: 503 }, { status: 429 }, 'drop', { status: 200, body: item }];
  const { env, seen } = await server(t, (_, count) => replies[count - 1] ?? { status: 503 });
  const answer = await answerOf(['show', '--id', 'a1'], { env });
  assert.deepEqual(answer.result, item);
  assert.equal(seen.length, 4);
});

test(
  'a fake answers a busy server at once, without the pauses of the tries',
  { timeout: 5_000 },
  async t => {
    // a test that mocks the clock never ticks it, so a fake waits on no timer
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const busy = fake(api, { 'GET /items/a1': reply(503) });
    const started = performance.now();
    const refused = await answerOf(['show', '--id', 'a1'], {
      env: { SHOP_TOKEN: 'tok' },
      fakes: [busy],
    });
    // the pauses of the three tries add up to 1.4 s
    assert.ok(performance.now() - started < 700);
    assert.deepEqual([refused.kind, codesOf(refused)], ['retry', ['SERVER_BUSY']]);
    assert.equal(refused.state, 'Nothing was changed.');
  },
);

test('an answer that is no HTTP is a network failure, and a read tries it again', async t => {
  const { env, seen } = await server(t, () => 'garbage');
  const answer = await answerOf(['show', '--id', 'a1'], { env });
  assert.deepEqual([answer.exit, answer.kind, codesOf(answer)], [1, 'retry', ['NETWORK_FAILED']]);
  assert.equal(seen.length, 4);
});

test('an answer that holds no JSON, fails its schema or is too large is refused', async t => {
  const big = 'x'.repeat(16_777_217);
  const { env } = await server(t, ({ url }) => {
    if (url.endsWith('/bad')) return { status: 200, body: { id: 'bad' } };
    if (url.endsWith('/text')) return { status: 200, raw: 'not json' };
    return { status: 200, raw: big };
  });
  const bad = await answerOf(['show', '--id', 'bad'], { env });
  const notJson = await answerOf(['show', '--id', 'text'], { env });
  const large = await answerOf(['show', '--id', 'big'], { env });
  assert.deepEqual([bad.kind, codesOf(bad)], ['ask', ['REMOTE_REFUSED']]);
  assert.match(bad.issues?.[0]?.message ?? '', /name/);
  assert.match(notJson.issues?.[0]?.message ?? '', /no JSON/);
  assert.match(large.issues?.[0]?.message ?? '', /too much/);
  // a send whose answer of 2xx adx cannot read has no status to map
  const weighed = await answerOf(['weigh'], { env });
  assert.deepEqual(weighed.result, { status: null });
});

test('a path part that would leave its place, or an address that is no http or https, is refused unsent', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: item }));
  for (const id of ['..', '.', '']) {
    const answer = await answerOf(['show', '--id', id], { env });
    assert.deepEqual([answer.kind, codesOf(answer)], ['fix', ['URL_NOT_ALLOWED']], id);
  }
  // a lone surrogate has no encoding, in a part of the path and in the query
  for (const argv of [
    ['show', '--json', '{"id":"\\ud800"}'],
    ['search', '--json', '{"q":"\\udfff"}'],
  ]) {
    const answer = await answerOf(argv, { env });
    assert.deepEqual(codesOf(answer), ['URL_NOT_ALLOWED'], argv[0]);
  }
  const port = env.SHOP_URL.split(':')[2] ?? '';
  for (const SHOP_URL of ['file:///etc', `http://ada:pw@127.0.0.1:${port}`, 'no address', '']) {
    const answer = await answerOf(['show', '--id', 'a1'], { env: { ...env, SHOP_URL } });
    assert.deepEqual(codesOf(answer), ['URL_NOT_ALLOWED'], SHOP_URL);
  }
  assert.deepEqual(seen, []);
});

test('a token that is missing or no token is refused with ENV_MISSING, and nothing is sent', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: item }));
  for (const SHOP_TOKEN of [undefined, '', 'tok\r\nX-Admin: 1']) {
    const given = SHOP_TOKEN === undefined ? { SHOP_URL: env.SHOP_URL } : { ...env, SHOP_TOKEN };
    const answer = await answerOf(['show', '--id', 'a1'], { env: given });
    assert.deepEqual([answer.kind, codesOf(answer)], ['ask', ['ENV_MISSING']]);
  }
  assert.deepEqual(seen, []);
});

test('a token goes over https or over http to the machine itself, and any other http address is refused unsent', async () => {
  const routes: string[] = [];
  const shelf = heard(fake(api, { 'GET /items/a1': item }), route => routes.push(route));
  const showAt = (SHOP_URL: string) =>
    answerOf(['show', '--id', 'a1'], { env: { SHOP_URL, SHOP_TOKEN: 'tok' }, fakes: [shelf] });
  const near = [
    'https://shop.example.com/api',
    'http://localhost:8080/api',
    'http://LOCALHOST/api',
  ];
  for (const SHOP_URL of [...near, 'http://127.0.0.1/api', 'http://[::1]:9/api']) {
    assert.deepEqual((await showAt(SHOP_URL)).result, item, SHOP_URL);
  }
  assert.equal(routes.length, 5);
  routes.length = 0;
  const far = ['http://shop.example.com/api', 'http://127.0.0.1.example.com/api'];
  for (const SHOP_URL of [
    ...far,
    'http://localhost.example.com',
    'http://127.0.0.2',
    'http://[::2]',
  ]) {
    const answer = await showAt(SHOP_URL);
    assert.deepEqual([answer.kind, codesOf(answer)], ['fix', ['URL_NOT_ALLOWED']], SHOP_URL);
    assert.match(answer.issues?.[0]?.message ?? '', /token/, SHOP_URL);
  }
  assert.deepEqual(routes, []);
  // a remote without a token may use plain http anywhere
  const open = remote('open', { url: envUrl('OPEN_URL', 'https://open.example.com') });
  const peek = read({ does: 'peeks', run: () => open.get(['x'], z.unknown()) });
  const bare = tool({ name: 'open', version: '0', does: 'x', remotes: [open], commands: { peek } });
  const env = { OPEN_URL: 'http://open.example.com' };
  const { exit } = await run(bare, ['peek'], { env, fakes: [fake(open, { 'GET /x': {} })] });
  assert.equal(exit, 0);
});

test('a redirect is not followed', async t => {
  const { env, seen } = await server(t, () => ({ status: 302, location: '/api/items/b2' }));
  const answer = await answerOf(['show', '--id', 'a1'], { env });
  assert.deepEqual(codesOf(answer), ['REMOTE_REFUSED']);
  assert.deepEqual(
    seen.map(one => one.url),
    ['/api/items/a1'],
  );
});

test('a dry run sends nothing, and the real run sends through act and adds its answer', async t => {
  const { env, seen } = await server(t, () => ({ status: 201, body: item }));
  const dry = await answerOf(['create', '--name', 'pen', '--dry-run'], { env });
  assert.deepEqual([dry.applied, dry.result], [false, { name: 'pen' }]);
  assert.deepEqual(seen, []);
  const real = await answerOf(['create', '--name', 'pen'], { env });
  assert.deepEqual(real.result, { name: 'pen', item });
  assert.deepEqual(seen, [
    {
      method: 'POST',
      url: '/api/items',
      auth: 'Bearer tok',
      type: 'application/json',
      body: '{"name":"pen"}',
    },
  ]);
});

test('a send is never tried again, and its refusal says what was sent and names the look', async t => {
  const { env, seen } = await server(t, () => 'drop');
  const answer = await answerOf(['create', '--name', 'pen'], { env });
  assert.deepEqual([answer.exit, answer.kind, codesOf(answer)], [1, 'retry', ['NETWORK_FAILED']]);
  assert.equal(answer.state, 'Sent without an answer, may have taken effect: the new item.');
  assert.equal(answer.issues?.[0]?.command, 'shop search --q pen');
  assert.equal(seen.length, 1);
});

test('a refusal in apply names the look only after a send, else the hint of its code', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: item }));
  const unsent = await answerOf(['create', '--name', 'pen'], { env: { SHOP_URL: env.SHOP_URL } });
  assert.deepEqual(codesOf(unsent), ['ENV_MISSING']);
  assert.equal(unsent.issues?.[0]?.command, undefined);
  assert.equal(unsent.state, 'Nothing was changed.');
  const hinted = await answerOf(['reserve', '--id', 'a1'], { env });
  assert.equal(hinted.issues?.[0]?.command, 'shop pick');
  assert.deepEqual(seen, []);
});

test('the state after apply names the files written and each send, after the state of failed', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'adx-remote-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const { env } = await server(t, ({ method }) => (method === 'POST' ? 'drop' : { status: 200 }));
  const unready = await answerOf(['stock', '--name', 'ink'], {
    cwd: folder,
    env: { SHOP_URL: env.SHOP_URL },
  });
  assert.deepEqual([codesOf(unready), unready.state], [['ENV_MISSING'], 'Nothing was changed.']);
  assert.equal(existsSync(join(folder, 'ink.json')), false);
  const dropped = await answerOf(['stock', '--name', 'pen'], { cwd: folder, env });
  assert.equal(
    dropped.state,
    'Written: pen.json. Sent without an answer, may have taken effect: the stock.',
  );
  assert.equal(existsSync(join(folder, 'pen.json')), true);
  const { env: answering } = await server(t, () => ({ status: 200 }));
  const migrated = await answerOf(['migrate'], { env: answering });
  assert.equal(migrated.state, 'The migration ran up to step 3. Answered: the note.');
  assert.equal(migrated.issues?.[0]?.command, 'shop search --q migration');
});

test('the status of a send is mapped by hand, and the state lists each request', async t => {
  const { env } = await server(t, ({ method }) => ({ status: method === 'PATCH' ? 409 : 200 }));
  const answer = await answerOf(['close', '--id', 'a1'], { env });
  assert.deepEqual([answer.kind, codesOf(answer)], ['fix', ['STILL_OPEN']]);
  assert.equal(answer.state, 'Answered: the note. Refused: the closed item.');
  assert.equal(answer.issues?.[0]?.command, 'shop show --id a1');
});

test('a fake answers in place of the server, in run and in invoke', async () => {
  const shelf = fake(api, {
    'GET /items/a1': item,
    'GET /items/b2': reply(404, { error: 'gone' }),
    'GET /items/c3': reply(200, { id: 'c3' }),
  });
  const options = { env: { SHOP_TOKEN: 'tok' }, fakes: [shelf] };
  assert.deepEqual((await answerOf(['show', '--id', 'a1'], options)).result, item);
  assert.deepEqual(codesOf(await answerOf(['show', '--id', 'b2'], options)), ['ITEM_NOT_FOUND']);
  // a route the fake lacks answers 404, as a server does for a path it does not know
  assert.deepEqual(codesOf(await answerOf(['show', '--id', 'd4'], options)), ['ITEM_NOT_FOUND']);
  assert.deepEqual(codesOf(await answerOf(['show', '--id', 'c3'], options)), ['REMOTE_REFUSED']);
  assert.deepEqual((await show.invoke({ id: 'a1' }, options)).result, item);
});

test('while adx answers a refusal it sends no request, and a value it cannot check stays out', async t => {
  const { env, seen } = await server(t, ({ url }) =>
    url === '/api/ids' ? { status: 200, body: ['zz'] } : { status: 404 },
  );
  const answer = await answerOf(['show', '--id', 'zz'], { env });
  assert.deepEqual(codesOf(answer), ['ITEM_NOT_FOUND']);
  assert.equal(answer.issues?.[0]?.command, 'shop pick');
  assert.deepEqual(
    seen.map(one => one.url),
    ['/api/items/zz'],
  );
});

test('a source a refusal asks sends no request, and the issue names the call that lists', async t => {
  const { env, seen } = await server(t, () => ({ status: 200, body: ['top'] }));
  const answer = await answerOf(['move', '--slot'], { env });
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path, i.command]),
    [['MISSING_VALUE', 'shelf', 'shop move --shelf']],
  );
  assert.deepEqual(seen, []);
});

test('schema names the variables of each remote, never their values', async () => {
  const { out } = await run(shop, ['schema'], { env: { SHOP_TOKEN: 'secret-token' } });
  const Variables = z.object({ variables: z.array(z.object({ variable: z.string() })) });
  const { result } = answerIn(out, Variables);
  assert.deepEqual(
    result?.variables.map(v => v.variable),
    ['SHOP_URL', 'SHOP_TOKEN'],
  );
  assert.equal(out.includes('secret-token'), false);
});

test('a remote the tool does not list, a fallback that is no address or sends a token over http, and apply without look are DECLARATION errors', async () => {
  const unlisted = tool({ name: 'shop', version: '1.0.0', does: 'sells', commands: { show } });
  const odd = remote('odd', { url: envUrl('ODD_URL', 'ftp://odd.example.com') });
  const oddShow = read({ does: 'reads', run: () => odd.get(['x'], z.unknown()) });
  const fallback = tool({
    name: 'odd',
    version: '1.0.0',
    does: 'reads',
    remotes: [odd],
    commands: { show: oddShow },
  });
  const plain = remote('plain', { url: 'http://plain.example.com', auth: bearer('PLAIN_TOKEN') });
  const plainShow = read({ does: 'reads', run: () => plain.get(['x'], z.unknown()) });
  const exposed = tool({
    name: 'plain',
    version: '1.0.0',
    does: 'reads',
    remotes: [plain],
    commands: { show: plainShow },
  });
  const blind = effect({ does: 'sends', plan: () => ({}), apply: () => ({}) });
  const unlooked = tool({ name: 'shop', version: '1.0.0', does: 'sells', commands: { blind } });
  const env = { SHOP_TOKEN: 'tok' };
  // the fallback and apply without look are checked at every start, the unlisted remote at its request
  for (const [made, argv] of [
    [unlisted, ['show', '--id', 'a1']],
    [fallback, []],
    [exposed, []],
    [unlooked, ['blind', '--dry-run']],
  ] as const) {
    const { exit, out } = await run(made, argv, { env });
    const answer = answerIn(out, z.unknown());
    assert.deepEqual([exit, answer.kind, codesOf(answer)], [2, 'bug', ['DECLARATION']]);
  }
  // invoke() skips the start checks, so the check before the request is its only guard
  const routes: string[] = [];
  const hearing = heard(fake(plain, { 'GET /x': {} }), route => routes.push(route));
  const invoked = await plainShow.invoke({}, { env: { PLAIN_TOKEN: 'tok' }, fakes: [hearing] });
  assert.deepEqual([invoked.kind, codesOf(invoked)], ['bug', ['DECLARATION']]);
  assert.match(invoked.issues?.[0]?.message ?? '', /token/);
  assert.deepEqual(routes, []);
});

test('under the test kit a remote without a fake reaches no server beyond the machine', async t => {
  const away = remote('away', { url: envUrl('AWAY_URL', 'https://away.example.com/api') });
  const reads = read({ does: 'reads', run: () => away.get(['x'], z.unknown()) });
  const far = tool({ name: 'away', version: '0', does: 'x', remotes: [away], commands: { reads } });
  const answer = answerIn((await run(far, ['reads'])).out, z.unknown());
  assert.deepEqual(
    [answer.kind, answer.issues?.map(i => [i.code, i.message])],
    [
      'bug',
      [
        [
          'DECLARATION',
          'the remote away has no fake in this test, and a request to https://away.example.com would leave the machine: add a fake of away to the samples',
        ],
      ],
    ],
  );
  // a program the kit runs gets ADX_FAKES_ONLY=1, and its remote without a fake is refused too
  const home = mkdtempSync(join(tmpdir(), 'adx-remote-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const program = join(import.meta.dirname, '..', 'fixtures', 'hello.program.ts');
  const env = { PATH: process.env.PATH, HOME: home, ADX_FAKES_ONLY: '1' };
  const ran = spawnSync(process.execPath, [program, 'whoami'], {
    env,
    cwd: home,
    encoding: 'utf8',
  });
  assert.deepEqual(
    answerIn(ran.stdout, z.unknown()).issues?.map(i => i.message),
    [
      'the remote hello has no fake in this test, and a request to https://hello.example.com would leave the machine: add a fake of hello to the samples',
    ],
  );
});
