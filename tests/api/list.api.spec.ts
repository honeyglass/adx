import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import {
  detailOf,
  dir,
  global,
  list,
  marker,
  paged,
  read,
  Refused,
  root,
  tell,
  tool,
} from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const Language = z.object({
  code: z.string().describe('the language code'),
  name: z.string(),
  hello: z.string(),
  formal: z.string().optional(),
});

const LANGUAGES = [
  { code: 'ar', name: 'Arabic', hello: 'Marhaba', formal: 'As-salamu alaykum' },
  { code: 'de', name: 'German', hello: 'Hallo', formal: 'Guten Tag' },
  { code: 'en', name: 'English', hello: 'Hello', formal: 'Good day' },
  { code: 'eo', name: 'Esperanto', hello: 'Saluton' },
  { code: 'fr', name: 'French', hello: 'Salut', formal: 'Bonjour' },
];

const Script = z.enum(['latin', 'arabic']).optional();

const languages = list({
  does: 'lists the languages',
  input: z.object({ script: Script }),
  item: Language,
  key: 'code',
  outline: ['name'],
  pageSize: 2,
  run: ({ script }, { page }) =>
    paged(
      LANGUAGES.filter(l => script === undefined || (l.code === 'ar') === (script === 'arabic')),
      page,
    ),
  next: () => [tell('greet in one of them')],
  text: item => `${item.code}:\n${item.hello}`,
});

const language = read({
  does: 'shows one language in full',
  input: z.object({ code: z.string(), script: Script }),
  values: { code: detailOf(languages) },
  run: ({ code }) => LANGUAGES.find(l => l.code === code) ?? {},
});

/** Each cursor the server list was asked with. */
const cursors: string[] = [];

const tickets = list({
  does: 'lists the tickets a server pages',
  item: z.object({ id: z.string() }),
  key: 'id',
  outline: [],
  run: (_, { page }) => {
    cursors.push(page.cursor);
    const next = page.cursor === '' ? { next: 'eyJvIjo1MH0' } : {};
    return { items: [{ id: `CW-${page.size}` }], ...next, total: 73 };
  },
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { languages, language, tickets },
});

const Items = z.object({
  items: z.array(z.unknown()),
  next: z.string().optional(),
  total: z.number().optional(),
});

const answerOf = async (...argv: string[]) => {
  const { exit, out } = await run(hello, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

test('paged cuts one page out of an array, names the following one, and counts all', () => {
  const all = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(paged(all, { cursor: '', size: 2 }), {
    items: ['a', 'b'],
    next: '2',
    total: 5,
  });
  assert.deepEqual(paged(all, { cursor: '2', size: 2 }), {
    items: ['c', 'd'],
    next: '4',
    total: 5,
  });
  assert.deepEqual(paged(all, { cursor: '4', size: 2 }), { items: ['e'], total: 5 });
  assert.deepEqual(paged(all, { cursor: '9', size: 2 }), { items: [], total: 5 });
  assert.deepEqual(paged([], { cursor: '', size: 50 }), { items: [], total: 0 });
});

test('paged refuses a cursor it never names, at --page', () => {
  for (const cursor of ['abc', '-2', '0', '02', '1.5', ' 2', '2 ']) {
    assert.throws(
      () => paged(['a', 'b'], { cursor, size: 1 }),
      (error: unknown) =>
        error instanceof Refused &&
        error.kind === 'fix' &&
        error.issues.map(issue => [issue.code, issue.path?.join('.')]).join() ===
          'NOT_IN_LIST,page',
      cursor,
    );
  }
});

test('a list answers the outline: the key first, then the fields the outline names', async () => {
  const { exit, out } = await run(hello, ['languages']);
  assert.equal(exit, 0);
  const listed = answerIn(out, z.object({ items: z.array(z.unknown()), total: z.number() }));
  assert.deepEqual(listed.result?.items, [
    { code: 'ar', name: 'Arabic' },
    { code: 'de', name: 'German' },
  ]);
  assert.equal(listed.result?.total, 5);
  assert.match(out, /"items":\[\{"code":"ar","name":"Arabic"\}/);
});

test('the steps of a list: the following page, the command for one item, then its own', async () => {
  const { next } = await answerOf('languages');
  assert.deepEqual(next, [
    { does: 'the following page', command: 'hello languages --page 2' },
    { does: 'shows one language in full', command: 'hello language', needs: ['code'] },
    { does: 'greet in one of them' },
  ]);
});

test('--page asks for the page a previous answer named, and the last page names none', async () => {
  const second = await answerOf('languages', '--page', '2');
  assert.deepEqual(Items.parse(second.result).items, [
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
  ]);
  assert.equal(second.next?.[0]?.command, 'hello languages --page 4');
  const last = await answerOf('languages', '--page', '4');
  assert.deepEqual(Items.parse(last.result), { items: [{ code: 'fr', name: 'French' }], total: 5 });
  assert.deepEqual(
    last.next?.map(step => step.does),
    ['shows one language in full', 'greet in one of them'],
  );
});

test('the following page and the one-item command carry the fields of the call', async () => {
  const { next } = await answerOf('languages', '--script', 'latin', '--fields', 'code,formal');
  assert.deepEqual(
    next?.map(step => step.command),
    [
      'hello languages --script latin --fields code,formal --page 2',
      'hello language --script latin',
      undefined,
    ],
  );
});

test('a server cursor passes through to the handler and into the step', async () => {
  cursors.length = 0;
  const first = await answerOf('tickets');
  assert.deepEqual(first.result, { items: [{ id: 'CW-50' }], next: 'eyJvIjo1MH0', total: 73 });
  assert.deepEqual(first.next, [
    { does: 'the following page', command: 'hello tickets --page eyJvIjo1MH0' },
  ]);
  const second = await answerOf('tickets', '--page', 'eyJvIjo1MH0');
  assert.deepEqual(second.next, undefined);
  const dashed = await answerOf('tickets', '--page=-x');
  assert.equal(dashed.exit, 0);
  assert.deepEqual(cursors, ['', 'eyJvIjo1MH0', '-x']);
});

test('a cursor paged never named is refused at --page, with the first page', async () => {
  const argv = ['languages', '--script', 'latin', '--fields', 'code', '--page', 'abc'];
  const { exit, issues } = await answerOf(...argv);
  assert.equal(exit, 1);
  assert.deepEqual(
    issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'page', 'hello languages --script latin --fields code']],
  );
});

test('a page whose items do not show the key names no command for one item', async () => {
  const cut = await answerOf('languages', '--fields', 'name');
  assert.deepEqual(
    cut.next?.map(step => step.does),
    ['the following page', 'greet in one of them'],
  );
  const keyless = list({
    does: 'lists items without their key',
    item: z.object({ id: z.string().optional(), title: z.string() }),
    key: 'id',
    outline: ['title'],
    run: () => ({ items: [{ title: 'A' }] }),
  });
  const show = read({
    does: 'shows one',
    input: z.object({ id: z.string() }),
    values: { id: detailOf(keyless) },
    run: ({ id }) => ({ id }),
  });
  const tooled = tool({ name: 'x', version: '0.1.0', does: 'x', commands: { keyless, show } });
  assert.equal(answerIn((await run(tooled, ['keyless'])).out, z.unknown()).next, undefined);
});

test('a path rides along in the steps of a list as adx shows it, relative to its root', async t => {
  const project = await mkdtemp(join(tmpdir(), 'adx-list-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeFile(join(project, 'go.mod'), '');
  await mkdir(join(project, 'internal', 'billing'), { recursive: true });
  const gomod = root('module', marker('go.mod'));
  const Finding = z.object({ id: z.string(), rule: z.string(), source: z.string() });
  const findings = list({
    does: 'checks the Go files of a folder',
    input: z.object({ dir: dir(gomod) }),
    item: Finding,
    key: 'id',
    outline: ['rule'],
    pageSize: 1,
    run: (_, { page }) =>
      paged(
        [
          { id: 'f-1', rule: 'error-wrap', source: 'x' },
          { id: 'f-2', rule: 'ctx-first', source: 'y' },
        ],
        page,
      ),
  });
  const finding = read({
    does: 'shows one finding in full',
    input: z.object({ dir: dir(gomod), id: z.string() }),
    values: { id: detailOf(findings) },
    run: ({ id }) => ({ id }),
  });
  const lintkit = tool({
    name: 'lintkit',
    version: '0.4.0',
    does: 'checks Go files',
    roots: [gomod],
    commands: { check: findings, finding },
  });
  for (const argv of [
    ['check', '--dir', './internal/billing/'],
    ['check', '--json', '{"dir":"internal//billing"}'],
  ]) {
    const { out } = await run(lintkit, argv, { cwd: project });
    assert.deepEqual(
      [argv, answerIn(out, z.unknown()).next?.map(step => step.command)],
      [
        argv,
        ['lintkit check --dir internal/billing --page 1', 'lintkit finding --dir internal/billing'],
      ],
    );
  }
});

test('a list with no item names no command for one item', async () => {
  const empty = list({
    does: 'lists nothing',
    item: z.object({ id: z.string(), title: z.string() }),
    key: 'id',
    outline: [],
    run: (_, { page }) => paged([], page),
  });
  const show = read({
    does: 'shows one',
    input: z.object({ id: z.string() }),
    values: { id: detailOf(empty) },
    run: ({ id }) => ({ id }),
  });
  const tooled = tool({ name: 'x', version: '0.1.0', does: 'x', commands: { empty, show } });
  const { exit, out } = await run(tooled, ['empty']);
  assert.deepEqual([exit, answerIn(out, z.unknown()).next], [0, undefined]);
});

test('--fields answers the named fields of each item, each whole', async () => {
  const { exit, result } = await answerOf('languages', '--fields', 'code,formal');
  assert.equal(exit, 0);
  assert.deepEqual(Items.parse(result).items, [
    { code: 'ar', formal: 'As-salamu alaykum' },
    { code: 'de', formal: 'Guten Tag' },
  ]);
});

test('--fields alone lists the fields of an item', async () => {
  const { exit, result } = await answerOf('languages', '--fields');
  assert.equal(exit, 0);
  assert.deepEqual(result, {
    option: 'fields',
    values: [
      { value: 'code', does: 'the language code' },
      { value: 'name' },
      { value: 'hello' },
      { value: 'formal' },
    ],
  });
});

test('a field an item does not have is refused with the call that lists them', async () => {
  const { exit, issues } = await answerOf('languages', '--fields', 'code,nmae');
  assert.equal(exit, 1);
  assert.deepEqual(
    issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'fields', 'hello languages --fields']],
  );
});

test('a read refuses --page, and a call that lists values refuses it beside', async () => {
  const onRead = await answerOf('language', '--code', 'de', '--page', '2');
  assert.deepEqual(
    onRead.issues?.map(i => [i.code, i.path]),
    [['UNKNOWN_OPTION', 'page']],
  );
  for (const argv of [
    ['languages', '--script', '--page', '2'],
    ['languages', '--fields', '--page', '2'],
    ['languages', '--page', '2', '--fields'],
    ['languages', '--fields', '', '--page', '2'],
  ]) {
    const beside = await answerOf(...argv);
    assert.deepEqual(
      [argv, beside.exit, beside.issues?.map(i => [i.code, i.path])],
      [argv, 1, [['UNKNOWN_OPTION', 'page']]],
    );
  }
});

test('at a terminal, a list prints each whole item on a line by its text; a cut one in adx form', async () => {
  const whole = await run(hello, ['languages'], { tty: true });
  assert.ok(whole.out.startsWith('ar:\\u{a}Marhaba\nde:\\u{a}Hallo\n\nNext:\n'), whole.out);
  const cut = await run(hello, ['languages', '--fields', 'hello'], { tty: true });
  assert.match(cut.out, /^items {2}\[\{"hello":"Marhaba"\},\{"hello":"Hallo"\}\]\n/);
});

test('schema of a list shows its item, key, outline, page size and options', async () => {
  const Shown = z.object({
    item: z.object({ properties: z.record(z.string(), z.unknown()) }),
    key: z.string(),
    outline: z.array(z.string()),
    pageSize: z.number(),
    options: z.array(z.object({ option: z.string() })),
  });
  const shown = Shown.parse((await answerOf('schema', 'languages')).result);
  assert.deepEqual(
    [Object.keys(shown.item.properties), shown.key, shown.outline, shown.pageSize],
    [['code', 'name', 'hello', 'formal'], 'code', ['code', 'name'], 2],
  );
  assert.deepEqual(
    shown.options.map(o => o.option),
    ['--json', '--help', '--page', '--fields'],
  );
  const sized = Shown.parse((await answerOf('schema', 'tickets')).result);
  assert.deepEqual([sized.outline, sized.pageSize], [['id'], 50]);
});

test('a global field rides along in the following page and the one-item command', async () => {
  const project = global({ input: z.object({ project: z.string() }), example: { project: 'web' } });
  const all = project.list({
    does: 'lists the tickets',
    item: z.object({ id: z.string(), title: z.string() }),
    key: 'id',
    outline: [],
    pageSize: 1,
    run: (_, { page }) =>
      paged(
        [
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
        ],
        page,
      ),
  });
  const show = project.read({
    does: 'shows one ticket',
    input: z.object({ id: z.string() }),
    values: { id: detailOf(all) },
    run: ({ id }) => ({ id }),
  });
  const tracker = tool({
    name: 'tracker',
    version: '0.1.0',
    does: 'x',
    global: project,
    commands: { ticket: { list: all, show } },
  });
  const { out } = await run(tracker, ['ticket', 'list', '--project', 'web']);
  assert.deepEqual(
    answerIn(out, z.unknown()).next?.map(step => step.command),
    ['tracker ticket list --project web --page 1', 'tracker ticket show --project web'],
  );
});

test('a list whose outline hides a field needs exactly one command for one item', async () => {
  const hiding = () =>
    list({
      does: 'lists',
      item: z.object({ id: z.string(), body: z.string() }),
      key: 'id',
      outline: [],
      run: (_, { page }) => paged([], page),
    });
  const shows = (of: ReturnType<typeof hiding>) =>
    read({
      does: 'shows one',
      input: z.object({ id: z.string() }),
      values: { id: detailOf(of) },
      run: ({ id }) => ({ id }),
    });
  const none = hiding();
  const twice = hiding();
  const cases: Parameters<typeof tool>[0]['commands'][] = [
    { all: none },
    { all: twice, one: shows(twice), other: shows(twice) },
    { all: list({ ...spec(), pageSize: 0 }) },
  ];
  for (const commands of cases) {
    const broken = tool({ name: 'x', version: '0.1.0', does: 'x', commands });
    const { exit, out } = await run(broken, ['all']);
    assert.deepEqual(
      [exit, answerIn(out, z.unknown()).issues?.map(i => i.code)],
      [2, ['DECLARATION']],
    );
  }
  const shown = hiding();
  const fine = tool({
    name: 'x',
    version: '0.1.0',
    does: 'x',
    commands: { shown, one: shows(shown) },
  });
  assert.equal((await run(fine, ['shown'])).exit, 0);
});

// A list that hides nothing, for a page size of its own.
function spec() {
  return {
    does: 'lists',
    item: z.object({ id: z.string() }),
    key: 'id' as const,
    outline: [],
    run: () => ({ items: [] }),
  };
}
