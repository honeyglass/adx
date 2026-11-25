import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  cwd,
  dir,
  effect,
  envDir,
  fresh,
  id,
  inFile,
  marker,
  multiline,
  outFile,
  read,
  root,
  tell,
  tool,
} from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';
import { program } from '../utils/program.ts';

const SEED = fileURLToPath(new URL('../fixtures/seed', import.meta.url));
const MARKED = fileURLToPath(new URL('../fixtures/marked.program.ts', import.meta.url));

const home = root('home', envDir('HELLO_HOME'));
const work = root('work', cwd);
const module = root('module', marker('go.mod'));

const names = async () => (await home.list('friends', '.json')).map(file => file.stem);

const add = effect({
  does: 'remembers a friend',
  input: z.object({ name: id(), about: multiline().default('') }),
  example: { name: 'ada' },
  values: { name: fresh(names) },
  plan: ({ name, about }, { files }) => files.write(home.file(`friends/${name}.json`), about),
});

const show = read({
  does: 'shows a file',
  input: z.object({ file: inFile(home) }),
  example: { file: 'friends/ada.json' },
  run: async ({ file }) => ({ file: file.rel, text: await file.text(8) }),
});

const save = effect({
  does: 'saves a file',
  input: z.object({ file: outFile(home) }),
  example: { file: 'notes/a.txt' },
  plan: ({ file }, { files }) => files.write(file, 'saved'),
});

const walk = read({
  does: 'lists the Go files of a folder',
  input: z.object({ dir: dir(module) }),
  example: { dir: '.' },
  run: async ({ dir }) => {
    const found: string[] = [];
    for await (const file of dir.walk('.go')) found.push(file.rel);
    return { dir: dir.rel, found };
  },
});

const here = read({
  does: 'reads a file of the working directory',
  input: z.object({ file: inFile(work) }),
  example: { file: 'a.txt' },
  run: async ({ file }) => ({ text: await file.text(100) }),
});

const echo = read({
  does: 'answers its input',
  input: z.object({ word: z.string(), text: multiline().default('') }),
  example: { word: 'hi' },
  run: input => input,
});

const store = effect({
  does: 'stores ada',
  plan: async (_, { files }) => {
    const written = files.write(home.file('friends/ada.json'), 'Ada');
    return { ...written, listed: (await home.list('friends', '.json')).length };
  },
  next: () => [tell(home.file('friends/ada.json').exists ? 'ada is stored' : 'ada is missing')],
});

const slow = read({
  does: 'reads a file after a while',
  input: z.object({ file: inFile(home) }),
  example: { file: 'f' },
  run: async ({ file }) => {
    await delay(20);
    return { text: await file.text(100) };
  },
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home, work, module],
  commands: { add, show, save, walk, here, echo, store, slow },
});

async function folder(t: TestContext) {
  const made = await mkdtemp(join(tmpdir(), 'adx-roots-'));
  t.after(() => rm(made, { recursive: true, force: true }));
  return made;
}

const answer = async (argv: string[], options: Parameters<typeof run>[2] = {}) => {
  const ran = await run(hello, argv, options);
  return { exit: ran.exit, ...answerIn(ran.out, z.unknown()) };
};

const codeOf = (a: { issues?: { code: string }[] }) => a.issues?.[0]?.code;

test('a data folder named by --home or the variable must exist, and the option wins', async t => {
  const data = await folder(t);
  await writeFile(join(data, 'file'), '');
  const cases: [string[], Record<string, string>][] = [
    [['--home', join(data, 'nope')], {}],
    [['--home', 'relative'], {}],
    [['--home', join(data, 'file')], {}],
    [[], { HELLO_HOME: '' }],
    [[], { HELLO_HOME: join(data, 'nope') }],
  ];
  for (const [moved, env] of cases) {
    const refused = await answer(['add', '--name', ...moved], { env });
    assert.deepEqual([refused.exit, refused.kind, codeOf(refused)], [1, 'ask', 'ROOT_NOT_FOUND']);
  }
  const wins = await answer(['add', '--name', 'ada', '--home', data], {
    env: { HELLO_HOME: join(data, 'nope') },
  });
  assert.equal(wins.exit, 0);
  assert.deepEqual(await readdir(join(data, 'friends')), ['ada.json']);
});

test('a moved folder is carried into every command adx names, the default one is not', async t => {
  const data = await folder(t);
  const moved = await answer(['add', '--name', 'ada', '--dry-run'], { env: { HELLO_HOME: data } });
  assert.equal(moved.next?.[0]?.command, `hello add --name ada --home ${data}`);
  const stayed = await answer(['add', '--name', 'ada', '--dry-run']);
  assert.equal(stayed.next?.[0]?.command, 'hello add --name ada');
});

test('the default folder may be missing: it counts as empty, and only a real write creates it', async () => {
  const listed = await answer(['add', '--name']);
  assert.deepEqual(listed.result, { option: 'name', taken: [] });
  const dry = await answer(['store', '--dry-run']);
  assert.deepEqual([dry.exit, dry.applied], [0, false]);
  assert.deepEqual(dry.result, { file: 'friends/ada.json', bytes: 3, replaces: false, listed: 0 });
  const real = await answer(['store']);
  assert.deepEqual(
    real.next?.map(step => step.does),
    ['ada is stored'],
  );
});

test('two calls at once each read and write in their own data folder', async t => {
  const [a, b] = [await folder(t), await folder(t)];
  await writeFile(join(a, 'f'), 'a');
  await writeFile(join(b, 'f'), 'b');
  const [first, second] = await Promise.all(
    [a, b].map(data => answer(['slow', '--file', 'f'], { env: { HELLO_HOME: data } })),
  );
  assert.deepEqual([first.result, second.result], [{ text: 'a' }, { text: 'b' }]);
});

test('in the test kit a root at an absolute place of its own lies in the scratch folder', async t => {
  const place = join(await folder(t), 'data');
  const placed = root('placed', envDir('PLACED_HOME', place));
  const keep = effect({
    does: 'keeps a note',
    plan: (_, { files }) => files.write(placed.file('note.txt'), 'x'),
  });
  const kit = tool({ name: 'kit', version: '0', does: 'x', roots: [placed], commands: { keep } });
  assert.equal((await run(kit, ['keep'])).exit, 0);
  assert.equal(existsSync(place), false);
  // invoke runs no start check, so a root or tool of no name's form is refused where the folder is
  // made: in the scratch, `roots/<root>` and `~/.<tool>` would climb out of it
  const away = join(tmpdir(), 'adx-climbed');
  t.after(() => rm(away, { recursive: true, force: true }));
  const climbing = root('../../adx-climbed', envDir('CLIMBING_HOME', place));
  const dotted = root('home', envDir('DOTTED_HOME'));
  for (const [name, made] of [
    ['kit', climbing],
    ['./../../adx-climbed', dotted],
  ] as const) {
    const climb = effect({
      does: 'climbs',
      plan: (_, { files }) => files.write(made.file('note.txt'), 'x'),
    });
    tool({ name, version: '0', does: 'x', roots: [made], commands: { climb } });
    for (const seed of [undefined, SEED]) {
      const invoked = await climb.invoke({}, seed === undefined ? {} : { seed });
      assert.deepEqual(
        invoked.issues?.map(i => i.code),
        ['DECLARATION'],
        name,
      );
    }
  }
  assert.equal(existsSync(away), false);
});

test('a plain string takes one line; multiline() takes line breaks and tabs', async () => {
  const refused: [string[], string][] = [
    [['--word', 'a\nb'], 'word'],
    [['--word', 'a\u001b[2J'], 'word'],
    [['--word', 'a', '--json', '{"text":"a\\u0007"}'], 'text'],
  ];
  for (const [argv, path] of refused) {
    const answered = await answer(['echo', ...argv]);
    assert.deepEqual([codeOf(answered), answered.issues?.[0]?.path], ['SCHEMA', path]);
  }
  const passed = await answer(['echo', '--word', 'a', '--json', '{"text":"a\\nb\\tc"}']);
  assert.deepEqual(passed.result, { word: 'a', text: 'a\nb\tc' });
});

test('a name longer than 255 bytes is refused in the plan, and one of 255 bytes is written', async t => {
  const data = await folder(t);
  const env = { HELLO_HOME: data };
  const long = await answer(['save', '--file', `notes/${'a'.repeat(256)}`, '--dry-run'], { env });
  assert.deepEqual([long.kind, codeOf(long)], ['fix', 'SCHEMA']);
  const fits = await answer(['save', '--file', `notes/${'a'.repeat(255)}`], { env });
  assert.equal(fits.exit, 0);
  assert.deepEqual(await readdir(join(data, 'notes')), ['a'.repeat(255)]);
});

test('the seed is copied into the data folder of the call', async t => {
  const seed = await folder(t);
  await mkdir(join(seed, 'friends'));
  await writeFile(join(seed, 'friends', 'ada.json'), 'Ada');
  const listed = await answer(['add', '--name'], { seed });
  assert.deepEqual(listed.result, { option: 'name', taken: ['ada'] });
  const shown = await answer(['show', '--file', './friends//ada.json'], { seed });
  assert.deepEqual(shown.result, { file: 'friends/ada.json', text: 'Ada' });
});

test('a path that leaves its root is PATH_OUTSIDE, also through a link', async t => {
  const data = await folder(t);
  const outside = await folder(t);
  await writeFile(join(outside, 'secret'), 'x');
  await symlink(outside, join(data, 'out'));
  const env = { HELLO_HOME: data };
  for (const file of ['../secret', '/etc/hosts', 'out/secret', 'a/../../secret']) {
    const refused = await answer(['show', '--file', file], { env });
    assert.deepEqual([codeOf(refused), refused.issues?.[0]?.path], ['PATH_OUTSIDE', 'file']);
  }
  const written = await answer(['save', '--file', 'out/new.txt'], { env });
  assert.equal(codeOf(written), 'PATH_OUTSIDE');
  assert.deepEqual(await readdir(outside), ['secret']);
  // a backslash is a sign of a name, as POSIX reads one
  assert.equal((await answer(['save', '--file', 'a\\b.txt'], { env })).exit, 0);
  assert.deepEqual((await readdir(data)).sort(), ['a\\b.txt', 'out']);
});

test('a file to read must exist and be a file, and a file to write must not be a folder', async t => {
  const data = await folder(t);
  await mkdir(join(data, 'friends'));
  await writeFile(join(data, 'friends', 'big.txt'), '123456789');
  await writeFile(join(data, 'plain'), '');
  const env = { HELLO_HOME: data };
  const cases: [string[], string][] = [
    [['show', '--file', 'friends/bob.json'], 'FILE_NOT_FOUND'],
    [['show', '--file', 'friends'], 'NOT_A_FILE'],
    [['show', '--file', 'friends/big.txt'], 'INPUT_TOO_LARGE'],
    [['save', '--file', 'friends'], 'NOT_A_FILE'],
    [['save', '--file', 'plain/a.txt'], 'NOT_A_FOLDER'],
  ];
  for (const [argv, code] of cases) assert.equal(codeOf(await answer(argv, { env })), code);
});

test('a link at the target is replaced by the write, never written through', async t => {
  const data = await folder(t);
  const outside = await folder(t);
  await writeFile(join(outside, 'kept'), 'kept');
  await mkdir(join(data, 'notes'));
  await symlink(join(outside, 'kept'), join(data, 'notes', 'a.txt'));
  const saved = await answer(['save', '--file', 'notes/a.txt', '--replace'], {
    env: { HELLO_HOME: data },
  });
  assert.equal(saved.exit, 0);
  const shown = await answer(['show', '--file', 'notes/a.txt'], { env: { HELLO_HOME: data } });
  assert.deepEqual(shown.result, { file: 'notes/a.txt', text: 'saved' });
  assert.deepEqual(await readdir(outside), ['kept']);
});

test('a step carries a path as adx shows it, relative to its root', async () => {
  const planned = await answer(['save', '--file', './notes//a.txt', '--dry-run']);
  assert.equal(planned.next?.[0]?.command, 'hello save --file notes/a.txt');
});

test('a marker root is the nearest folder up from the working directory, and under the test kit none above a working directory the test names', async t => {
  const project = await folder(t);
  await writeFile(join(project, 'go.mod'), '');
  await mkdir(join(project, 'pkg', 'sub'), { recursive: true });
  await writeFile(join(project, 'pkg', 'b.go'), '');
  await writeFile(join(project, 'pkg', 'sub', 'a.go'), '');
  await writeFile(join(project, 'pkg', 'readme.md'), '');
  const sub = join(project, 'pkg', 'sub');
  const found = { dir: 'pkg', found: ['pkg/b.go', 'pkg/sub/a.go'] };
  // as a program, outside the kit, the walk goes up from the working directory
  const ran = await program(MARKED, ['walk', '--dir', './pkg/'], { home: sub });
  assert.deepEqual(answerIn(ran.out, z.unknown()).result, found);
  const walked = await answer(['walk', '--dir', './pkg/'], { cwd: project });
  assert.deepEqual(walked.result, found);
  assert.equal(codeOf(await answer(['walk', '--dir', 'go.mod'], { cwd: project })), 'NOT_A_FOLDER');
  // the kit reads no folder above the one the test named
  assert.equal(codeOf(await answer(['walk', '--dir', '.'], { cwd: sub })), 'ROOT_NOT_FOUND');
  const bare = await folder(t);
  assert.equal(codeOf(await answer(['walk', '--dir', '.'], { cwd: bare })), 'ROOT_NOT_FOUND');
});

test('a cwd root is the working directory of the call', async t => {
  const place = await folder(t);
  await writeFile(join(place, 'a.txt'), 'here');
  assert.deepEqual((await answer(['here', '--file', 'a.txt'], { cwd: place })).result, {
    text: 'here',
  });
});

test('id() takes letters, digits, - and _ only; multiline() takes line breaks', async () => {
  const bad = await answer(['add', '--name', 'a/b', '--dry-run']);
  assert.deepEqual([codeOf(bad), bad.issues?.[0]?.path], ['SCHEMA', 'name']);
  const good = await answer([
    'add',
    '--name',
    'Ada_1-x',
    '--json',
    '{"about":"a\\nb"}',
    '--dry-run',
  ]);
  assert.equal(good.exit, 0);
});

test('an id() field needs a source in values, however the field is written', async () => {
  const named = (input: z.ZodObject) =>
    tool({
      name: 'hello',
      version: '0.1.0',
      does: 'x',
      commands: { show: read({ does: 'shows a friend', input, run: () => ({}) }) },
    });
  const bare = named(z.object({ name: id() }));
  const ran = answerIn((await run(bare, ['show', '--name', 'ada'])).out, z.unknown());
  assert.deepEqual(
    ran.issues?.map(i => [i.code, i.message]),
    [['DECLARATION', 'hello show has the id field name, and no source in values lists its values']],
  );
  const wrapped = named(z.object({ name: id().min(2).optional().describe('the friend') }));
  assert.equal(codeOf(answerIn((await run(wrapped, ['show'])).out, z.unknown())), 'DECLARATION');
  // an id inside a list, a union or a lazy schema is an id field too
  for (const field of [
    z.array(id()),
    z.union([id(), z.number()]),
    z.lazy(() => id()),
    z.array(z.lazy(() => id().optional())).default([]),
  ]) {
    const inner = named(z.object({ name: field }));
    const declared = answerIn((await run(inner, ['show'])).out, z.unknown());
    assert.equal(codeOf(declared), 'DECLARATION');
  }
  const plain = named(z.object({ name: z.string() }));
  assert.equal((await run(plain, ['show', '--name', 'ada'])).exit, 0);
  // add of the tool above gives its id() field the source fresh(), so hello starts
  assert.equal((await answer(['add', '--name', 'ada', '--dry-run'])).exit, 0);
});

test('every command takes --home, and a field named like a root is a DECLARATION error', async () => {
  const help = await answer(['show', '--help']);
  const options = z
    .object({ options: z.array(z.object({ option: z.string() })) })
    .parse(help.result);
  assert.ok(options.options.some(option => option.option === '--home'));
  const clash = effect({
    does: 'x',
    input: z.object({ work: z.string() }),
    example: { work: 'a' },
    plan: () => ({}),
  });
  const broken = tool({ name: 'b', version: '0', does: 'x', roots: [work], commands: { clash } });
  const ran = answerIn((await run(broken, ['clash', '--work', 'a'])).out, z.unknown());
  assert.equal(codeOf(ran), 'DECLARATION');
});
