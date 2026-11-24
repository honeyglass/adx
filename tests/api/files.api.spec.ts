import assert from 'node:assert/strict';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { z } from 'zod';
import { effect, envDir, id, outFile, root, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const home = root('home', envDir('HELLO_HOME'));

const LIMIT = 4096;

const friendFile = (name: string) => home.file(`friends/${name}.json`);

const Friend = z.object({ name: id(), lang: z.string() });

const add = effect({
  does: 'remembers a friend',
  input: Friend,
  example: { name: 'ada', lang: 'de' },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});

const keep = effect({
  does: 'remembers a friend once',
  input: Friend,
  example: { name: 'ada', lang: 'de' },
  replace: false,
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});

const edit = effect({
  does: "changes a friend's language",
  input: Friend,
  example: { name: 'ada', lang: 'en' },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => JSON.stringify({ ...JSON.parse(old), lang })),
});

const note = effect({
  does: 'adds a line to the notes',
  input: z.object({ line: z.string() }),
  example: { line: 'hi' },
  plan: ({ line }, { files }) =>
    files.update(home.file('notes.txt'), LIMIT, old => `${old}${line}\n`),
});

const exported = effect({
  does: 'writes the names for others to read',
  input: z.object({ file: outFile(home), names: z.array(z.string()) }),
  example: { file: 'public/names.txt', names: ['ada'] },
  replace: 'always',
  plan: ({ file, names }, { files }) => files.write(file, names.join('\n'), { mode: 0o644 }),
});

const pair = effect({
  does: 'writes two files',
  input: z.object({ first: outFile(home), second: outFile(home) }),
  example: { first: 'a/one.txt', second: 'b/two.txt' },
  plan: ({ first, second }, { files }) => ({
    first: files.write(first, 'one'),
    second: files.write(second, 'two'),
  }),
});

const nothing = effect({ does: 'writes nothing', plan: () => ({ done: true }) });

const touch = effect({
  does: 'changes nothing in the notes',
  replace: false,
  plan: (_, { files }) => files.update(home.file('notes.txt'), LIMIT, old => old),
});

const twice = effect({
  does: 'writes one file twice',
  plan: (_, { files }) => [
    files.write(home.file('a.txt'), 'a'),
    files.write(home.file('a.txt'), 'b'),
  ],
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home],
  commands: { friends: { add, keep, edit }, note, export: exported, pair, nothing, touch, twice },
});

const Result = z.object({
  file: z.string(),
  bytes: z.number(),
  replaces: z.boolean(),
  unchanged: z.literal(true).optional(),
  changes: z
    .object({
      added: z.array(z.string()),
      changed: z.array(z.string()),
      removed: z.array(z.string()),
      more: z.number(),
    })
    .optional(),
});

/** A data folder the test owns, which HELLO_HOME names, removed after the test. */
async function folder(t: TestContext) {
  const made = await mkdtemp(join(tmpdir(), 'adx-files-'));
  t.after(() => rm(made, { recursive: true, force: true }));
  return made;
}

const call = (data: string, ...argv: string[]) => run(hello, argv, { env: { HELLO_HOME: data } });

const ADA = ['friends', 'add', '--name', 'ada', '--lang', 'de'];

const modeOf = async (path: string) => (await stat(path)).mode & 0o777;

test('a dry run answers the write and changes nothing; the real run writes it with mode 0600', async t => {
  const data = await folder(t);
  const dry = answerIn((await call(data, ...ADA, '--dry-run')).out, Result);
  assert.deepEqual(dry.result, { file: 'friends/ada.json', bytes: 26, replaces: false });
  assert.deepEqual(await readdir(data), []);
  const real = await call(data, ...ADA);
  assert.equal(real.exit, 0);
  assert.equal(answerIn(real.out, Result).applied, true);
  const file = join(data, 'friends', 'ada.json');
  assert.equal(await readFile(file, 'utf8'), '{"name":"ada","lang":"de"}');
  assert.equal(await modeOf(file), 0o600);
  assert.equal(await modeOf(join(data, 'friends')), 0o700);
});

test('the same bytes again write nothing and need no --replace', async t => {
  const data = await folder(t);
  await call(data, ...ADA);
  const file = join(data, 'friends', 'ada.json');
  await chmod(file, 0o640);
  const again = answerIn((await call(data, ...ADA)).out, Result);
  assert.equal(again.applied, true);
  assert.deepEqual(again.result, {
    file: 'friends/ada.json',
    bytes: 26,
    replaces: false,
    unchanged: true,
  });
  assert.equal(await modeOf(file), 0o640);
  const replaced = answerIn((await call(data, ...ADA, '--replace')).out, Result);
  assert.equal(replaced.result?.unchanged, true);
});

test('other bytes under a taken name are refused, and --replace replaces them', async t => {
  const data = await folder(t);
  await call(data, ...ADA);
  const file = join(data, 'friends', 'ada.json');
  await chmod(file, 0o640);
  const en = ['friends', 'add', '--name', 'ada', '--lang', 'en'];
  const refused = await call(data, ...en);
  const answer = answerIn(refused.out, z.unknown());
  assert.equal(refused.exit, 1);
  assert.deepEqual(
    [answer.kind, answer.state, answer.issues?.[0]?.code, answer.issues?.[0]?.hint],
    [
      'fix',
      'Nothing was changed.',
      'ALREADY_EXISTS',
      'add --replace to overwrite friends/ada.json',
    ],
  );
  assert.equal(
    answer.issues?.[0]?.command,
    `hello friends add --name ada --lang en --home ${data} --replace --dry-run`,
  );
  const shown = answerIn((await call(data, ...en, '--replace', '--dry-run')).out, Result);
  assert.deepEqual(shown.result?.changes, { added: [], changed: ['lang'], removed: [], more: 0 });
  assert.equal(shown.result?.replaces, true);
  assert.equal(
    shown.next?.[0]?.command,
    `hello friends add --name ada --lang en --home ${data} --replace`,
  );
  assert.equal(await readFile(file, 'utf8'), '{"name":"ada","lang":"de"}');
  assert.equal((await call(data, ...en, '--replace')).exit, 0);
  assert.equal(await readFile(file, 'utf8'), '{"name":"ada","lang":"en"}');
  assert.equal(await modeOf(file), 0o640);
});

test('a command without --replace refuses a taken name with "pick another name"', async t => {
  const data = await folder(t);
  await call(data, ...ADA);
  const refused = await call(data, 'friends', 'keep', '--name', 'ada', '--lang', 'en');
  const issue = answerIn(refused.out, z.unknown()).issues?.[0];
  assert.deepEqual(
    [issue?.code, issue?.hint, issue?.command],
    ['ALREADY_EXISTS', 'pick another name', undefined],
  );
  const option = await call(data, 'friends', 'keep', '--name', 'bob', '--lang', 'en', '--replace');
  assert.equal(answerIn(option.out, z.unknown()).issues?.[0]?.code, 'UNKNOWN_OPTION');
});

test("replace: 'always' replaces without the option, keeps its mode and shows in schema", async t => {
  const data = await folder(t);
  const argv = ['export', '--file', 'public/names.txt', '--names', 'ada'];
  const first = answerIn((await call(data, ...argv)).out, Result);
  assert.equal(first.result?.replaces, false);
  const file = join(data, 'public', 'names.txt');
  assert.equal(await modeOf(file), 0o644);
  const second = answerIn((await call(data, ...argv, '--names', 'bob')).out, Result);
  assert.deepEqual(second.result?.changes, { added: ['bob'], changed: [], removed: [], more: 0 });
  assert.equal(await readFile(file, 'utf8'), 'ada\nbob');
  const option = await call(data, ...argv, '--replace');
  assert.equal(answerIn(option.out, z.unknown()).issues?.[0]?.code, 'UNKNOWN_OPTION');
  const schema = answerIn(
    (await call(data, 'schema', 'export')).out,
    z.object({ replace: z.string() }),
  );
  assert.equal(schema.result?.replace, 'always');
});

test('--replace is refused when the plan stages no files.write', async t => {
  const data = await folder(t);
  await writeFile(join(data, 'notes.txt'), 'a\n');
  for (const argv of [
    ['nothing', '--replace'],
    ['note', '--line', 'b', '--replace'],
  ]) {
    const refused = answerIn((await call(data, ...argv)).out, z.unknown());
    assert.deepEqual(
      [refused.issues?.[0]?.code, refused.issues?.[0]?.path],
      ['UNKNOWN_OPTION', 'replace'],
    );
  }
  assert.equal(await readFile(join(data, 'notes.txt'), 'utf8'), 'a\n');
});

test('files.update changes a file, keeps its mode, and refuses a missing one', async t => {
  const data = await folder(t);
  const missing = await call(data, 'friends', 'edit', '--name', 'ada', '--lang', 'en');
  const issue = answerIn(missing.out, z.unknown());
  assert.deepEqual(
    [missing.exit, issue.kind, issue.issues?.[0]?.code],
    [1, 'fix', 'FILE_NOT_FOUND'],
  );
  await writeFile(join(data, 'notes.txt'), 'a\n', { mode: 0o640 });
  const added = answerIn((await call(data, 'note', '--line', 'b')).out, Result);
  assert.deepEqual(added.result?.changes, { added: ['b'], changed: [], removed: [], more: 0 });
  assert.equal(await readFile(join(data, 'notes.txt'), 'utf8'), 'a\nb\n');
  assert.equal(await modeOf(join(data, 'notes.txt')), 0o640);
  await call(data, ...ADA);
  const same = answerIn(
    (await call(data, 'friends', 'edit', '--name', 'ada', '--lang', 'de')).out,
    Result,
  );
  assert.deepEqual(same.result, {
    file: 'friends/ada.json',
    bytes: 26,
    replaces: false,
    unchanged: true,
  });
});

test('changes name JSON paths and lines, at most 20 per list, and count the rest', async t => {
  const data = await folder(t);
  await mkdir(join(data, 'friends'));
  const old = { name: 'ada', lang: 'de', langs: ['de'], gone: 1 };
  await writeFile(join(data, 'friends', 'ada.json'), JSON.stringify(old));
  const update = effect({
    does: 'updates ada',
    replace: false,
    plan: (_, { files }) =>
      files.update(friendFile('ada'), LIMIT, () =>
        JSON.stringify({ name: 'ada', lang: 'en', langs: ['de', 'en'] }),
      ),
  });
  const lines = effect({
    does: 'writes many lines',
    replace: 'always',
    plan: (_, { files }) =>
      files.write(home.file('lines.txt'), Array.from({ length: 25 }, (_, i) => `${i}`).join('\n')),
  });
  const kit = tool({
    name: 'hello',
    version: '0',
    does: 'x',
    roots: [home],
    commands: { update, lines },
  });
  const changed = answerIn((await run(kit, ['update'], { env: { HELLO_HOME: data } })).out, Result);
  assert.deepEqual(changed.result?.changes, {
    added: ['langs.1'],
    changed: ['lang'],
    removed: ['gone'],
    more: 0,
  });
  await writeFile(join(data, 'lines.txt'), 'x');
  const many = answerIn((await run(kit, ['lines'], { env: { HELLO_HOME: data } })).out, Result);
  assert.deepEqual(
    [many.result?.changes?.added.length, many.result?.changes?.removed, many.result?.changes?.more],
    [20, ['x'], 5],
  );
});

test('every staged file is written, or none: a failed write leaves nothing', async t => {
  const data = await folder(t);
  await mkdir(join(data, 'b'));
  await chmod(join(data, 'b'), 0o500);
  const pair = ['pair', '--first', 'a/one.txt', '--second', 'b/two.txt'];
  const failed = await call(data, ...pair);
  const answer = answerIn(failed.out, z.unknown());
  assert.deepEqual(
    [failed.exit, answer.kind, answer.issues?.[0]?.code, answer.state],
    [1, 'ask', 'SYSTEM_REFUSED', 'Nothing was changed. The temporary files were removed.'],
  );
  assert.deepEqual(await readdir(data), ['b']);
  await chmod(join(data, 'b'), 0o700);
  assert.equal((await call(data, ...pair)).exit, 0);
  assert.deepEqual(
    [await readdir(join(data, 'a')), await readdir(join(data, 'b'))],
    [['one.txt'], ['two.txt']],
  );
});

test('a rename that fails after the first names the files moved in and those not', async t => {
  const data = await folder(t);
  // The second file goes where the first one's folder stands by then, so its rename fails.
  const failed = await call(data, 'pair', '--first', 'x/a/b', '--second', 'x/a');
  const answer = answerIn(failed.out, z.unknown());
  assert.deepEqual(
    [answer.kind, answer.state],
    ['ask', 'Moved in: x/a/b. Not moved: x/a. The temporary file was removed.'],
  );
  assert.deepEqual(await readdir(join(data, 'x', 'a')), ['b']);
});

test('a plan that writes one file twice is a DECLARATION error', async t => {
  const data = await folder(t);
  const ran = await call(data, 'twice');
  assert.deepEqual(
    [ran.exit, answerIn(ran.out, z.unknown()).issues?.[0]?.code],
    [2, 'DECLARATION'],
  );
  assert.deepEqual(await readdir(data), []);
});

test('an update keeps a byte order mark and refuses bytes that are no UTF-8', async t => {
  const data = await folder(t);
  const notes = join(data, 'notes.txt');
  await writeFile(notes, '\ufeffa\n');
  const kept = answerIn((await call(data, 'touch')).out, Result);
  assert.equal(kept.result?.unchanged, true);
  assert.equal(await readFile(notes, 'utf8'), '\ufeffa\n');
  await writeFile(notes, Uint8Array.of(0x61, 0xff));
  const refused = answerIn((await call(data, 'touch')).out, z.unknown());
  assert.deepEqual([refused.kind, refused.issues?.[0]?.code], ['ask', 'STORED_INVALID']);
  assert.deepEqual([...(await readFile(notes))], [0x61, 0xff]);
});

test('a stored file past the limit of the tool is STORED_INVALID, for the person', async t => {
  const data = await folder(t);
  await writeFile(join(data, 'notes.txt'), 'a'.repeat(LIMIT + 1));
  const refused = answerIn((await call(data, 'note', '--line', 'b')).out, z.unknown());
  assert.deepEqual([refused.kind, refused.issues?.[0]?.code], ['ask', 'STORED_INVALID']);
});

test('a write through a link to a file inside the root writes that file, and the link stays', async t => {
  const data = await folder(t);
  await mkdir(join(data, 'friends'));
  const real = join(data, 'friends', 'real.json');
  await writeFile(real, '{"name":"ada","lang":"de"}', { mode: 0o640 });
  await symlink('real.json', join(data, 'friends', 'ada.json'));
  const edited = await call(data, 'friends', 'edit', '--name', 'ada', '--lang', 'en');
  assert.equal(edited.exit, 0);
  assert.equal((await lstat(join(data, 'friends', 'ada.json'))).isSymbolicLink(), true);
  assert.equal(await readFile(real, 'utf8'), '{"name":"ada","lang":"en"}');
  assert.equal(await modeOf(real), 0o640);
  const same = answerIn(
    (await call(data, 'friends', 'add', '--name', 'ada', '--lang', 'en')).out,
    Result,
  );
  assert.equal(same.result?.unchanged, true);
});

test('invoke takes the seed, the variables and replace', async () => {
  const seed = await mkdtemp(join(tmpdir(), 'adx-seed-'));
  await mkdir(join(seed, 'friends'));
  await writeFile(join(seed, 'friends', 'ada.json'), '{"name":"ada","lang":"de"}');
  const friend = { name: 'ada', lang: 'en' };
  const refused = await add.invoke(friend, { seed });
  const replaced = await add.invoke(friend, { seed, replace: true });
  const created = await add.invoke({ name: 'bob', lang: 'en' }, { seed });
  await rm(seed, { recursive: true });
  assert.equal(refused.issues?.[0]?.code, 'ALREADY_EXISTS');
  assert.equal(Result.parse(replaced.result).replaces, true);
  assert.equal(Result.parse(created.result).replaces, false);
});
