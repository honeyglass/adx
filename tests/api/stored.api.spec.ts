import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { z } from 'zod';
import { trySync$ } from '@honeyglass/utils/ts';
import { effect, envDir, read, Refused, root, stored, tool } from '@honeyglass/adx';
import type { Stored } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const FriendV1 = z.object({ name: z.string(), lang: z.string() });
const FriendV2 = z.object({ name: z.string(), langs: z.array(z.string()) });
const FriendV3 = z.object({ name: z.string(), langs: z.array(z.string()), nick: z.string() });

const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));

const Friend3 = stored('friend', 3, FriendV3)
  .from(2, FriendV2, old => ({ ...old, nick: old.name }))
  .from(1, FriendV1, old => ({ name: old.name, langs: [old.lang] }));

// Format 2 was a beta that no release kept, so no step names it.
const Note = stored('note', 3, z.object({ text: z.string() })).from(
  1,
  z.object({ line: z.string() }),
  old => ({ text: old.line }),
);

/** The kind and the codes of the refusal a parse throws; the test fails when it throws none. */
function refusalOf(parse: () => unknown) {
  const { error } = trySync$(parse);
  assert.ok(error instanceof Refused, `no refusal: ${error}`);
  return [error.kind, error.issues.map(issue => issue.code)];
}

test('stringify writes the format number of the kind before the fields, over a version of the value', () => {
  assert.deepEqual([Friend.name, Friend.version], ['friend', 2]);
  assert.equal(
    Friend.stringify({ name: 'ada', langs: ['de', 'eo'] }),
    '{"version":2,"name":"ada","langs":["de","eo"]}',
  );
  const carried = { name: 'ada', langs: ['de'], version: 9 };
  assert.equal(Friend.stringify(carried), '{"version":2,"name":"ada","langs":["de"]}');
});

test('parse reads the current format, and a text without a number as format 1', () => {
  const ada = { name: 'ada', langs: ['de'] };
  assert.deepEqual(Friend.parse('{"version":2,"name":"ada","langs":["de"]}'), ada);
  assert.deepEqual(Friend.parse('{"version":1,"name":"ada","lang":"de"}'), ada);
  assert.deepEqual(Friend.parse('{"name":"ada","lang":"de"}'), ada);
});

test('an older format is converted one step after the other up to the current one', () => {
  assert.deepEqual(Friend3.parse('{"name":"ada","lang":"de"}'), {
    name: 'ada',
    langs: ['de'],
    nick: 'ada',
  });
  assert.deepEqual(Friend3.parse('{"version":2,"name":"ada","langs":["de","eo"]}'), {
    name: 'ada',
    langs: ['de', 'eo'],
    nick: 'ada',
  });
  assert.deepEqual(Note.parse('{"line":"hi"}'), { text: 'hi' });
});

test('a newer format is refused with NEWER_VERSION, for the person, whatever its size', () => {
  for (const version of ['3', '1e300', '9007199254740993'])
    assert.deepEqual(
      refusalOf(() => Friend.parse(`{"version":${version},"name":"ada","langs":["de"]}`)),
      ['ask', ['NEWER_VERSION']],
      version,
    );
});

test('a text adx cannot read as a format of its kind is STORED_INVALID, for the person', () => {
  const texts: [string, () => unknown][] = [
    ['no JSON', () => Friend.parse('{"name":')],
    ['the current format with a field missing', () => Friend.parse('{"version":2,"name":"ada"}')],
    ['an older format with a field missing', () => Friend.parse('{"name":"ada"}')],
    ['a number as a string', () => Friend.parse('{"version":"2","name":"ada","langs":[]}')],
    ['a newer number as a string', () => Friend.parse('{"version":"3","name":"ada","langs":[]}')],
    ['the number 0', () => Friend.parse('{"version":0,"name":"ada","langs":[]}')],
    ['a number that is no whole number', () => Friend.parse('{"version":1.5,"name":"ada"}')],
    ['a list', () => Friend.parse('[]')],
    ['a format the kind does not declare', () => Note.parse('{"version":2,"text":"hi"}')],
  ];
  for (const [what, parse] of texts)
    assert.deepEqual(refusalOf(parse), ['ask', ['STORED_INVALID']], what);
});

test('a step up that answers no item of the current format is a bug of the tool, DECLARATION', () => {
  const Named = stored('friend', 2, z.object({ name: z.string().min(1) })).from(
    1,
    z.object({ nick: z.string() }),
    () => ({ name: '' }),
  );
  assert.deepEqual(
    refusalOf(() => Named.parse('{"nick":"ada"}')),
    ['bug', ['DECLARATION']],
  );
});

// A command stands in one tool only, so each tool gets its own.
const answerOf = async (kind: Stored<unknown, never>) => {
  const show = read({ does: 'shows ada', run: () => ({ ok: true }) });
  const hello = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'greets people',
    stored: [kind],
    commands: { show },
  });
  const { exit, out } = await run(hello, ['show']);
  const answer = answerIn(out, z.unknown());
  return [exit, answer.kind, answer.issues?.map(issue => issue.code)];
};

test('a listed kind whose numbers do not run from the newest down, or whose schema has a version, is a DECLARATION error', async () => {
  const kinds = [
    stored('friend', 2, FriendV2.extend({ version: z.string() })),
    stored('friend', 2, FriendV2).from(1, FriendV1.extend({ version: z.number() }), old => ({
      name: old.name,
      langs: [old.lang],
    })),
    stored('friend', 2, FriendV2).from(2, FriendV1, old => ({ name: old.name, langs: [] })),
    stored('friend', 2, FriendV2).from(3, FriendV1, old => ({ name: old.name, langs: [] })),
    stored('friend', 0, FriendV2),
    stored('friend', 2.5, FriendV2),
  ];
  for (const kind of kinds) assert.deepEqual(await answerOf(kind), [2, 'bug', ['DECLARATION']]);
  assert.deepEqual(await answerOf(Friend), [0, undefined, undefined]);
});

const home = root('home', envDir('HELLO_HOME'));
const LIMIT = 4096;
const ada = home.file('friends/ada.json');

const Broken = stored('friend', 2, FriendV2).from(1, FriendV1, () => {
  throw new TypeError('the step up has a bug');
});

const show = read({ does: 'shows ada', run: () => ada.json(LIMIT, Friend) });
const learn = effect({
  does: 'teaches ada Esperanto',
  replace: false,
  plan: (_, { files }) =>
    files.update(ada, LIMIT, old => {
      const friend = Friend.parse(old);
      return Friend.stringify({ ...friend, langs: [...friend.langs, 'eo'] });
    }),
});
const broken = read({ does: 'shows ada by a broken step', run: () => ada.json(LIMIT, Broken) });
const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home],
  stored: [Friend, Broken],
  commands: { show, learn, broken },
});

/** A data folder whose friend ada holds the text. */
async function holding(t: TestContext, text: string) {
  const data = await mkdtemp(join(tmpdir(), 'adx-stored-'));
  t.after(() => rm(data, { recursive: true, force: true }));
  await mkdir(join(data, 'friends'));
  await writeFile(join(data, 'friends', 'ada.json'), text);
  return data;
}

const called = async (data: string, command: string) => {
  const { exit, out } = await run(hello, [command], { env: { HELLO_HOME: data } });
  const answer = answerIn(out, z.unknown());
  const [issue] = answer.issues ?? [];
  return [exit, answer.kind, issue?.code, issue?.message.includes('friends/ada.json')];
};

test('a stored file adx cannot read is refused with its path, through file.json and files.update', async t => {
  const texts: [string, string][] = [
    ['{"version":3,"name":"ada","langs":[]}', 'NEWER_VERSION'],
    ['{"version":2,"name":"ada"}', 'STORED_INVALID'],
  ];
  for (const [text, code] of texts) {
    const data = await holding(t, text);
    for (const command of ['show', 'learn'])
      assert.deepEqual(await called(data, command), [1, 'ask', code, true], `${command} ${code}`);
  }
});

test('a kind left out of stored is refused at the call, through file.json, parse and stringify, as a DECLARATION bug', async t => {
  const peek = read({ does: 'peeks at ada', run: () => ada.json(LIMIT, Friend) });
  const reread = read({
    does: 'parses ada',
    run: () => Friend.parse('{"name":"ada","lang":"de"}'),
  });
  const ada2 = { name: 'ada', langs: ['eo'] };
  const save = effect({
    does: 'saves ada',
    replace: false,
    plan: (_, { files }) => files.write(ada, Friend.stringify(ada2)),
  });
  const swap = effect({
    does: 'swaps ada',
    replace: false,
    plan: (_, { files }) => files.update(ada, LIMIT, () => Friend.stringify(ada2)),
  });
  const forgetful = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'greets people',
    roots: [home],
    commands: { peek, reread, save, swap },
  });
  const data = await holding(t, '{"name":"ada","lang":"de"}');
  for (const [command, use] of [
    ['peek', 'reads'],
    ['reread', 'reads'],
    ['swap', 'writes'],
  ]) {
    const { exit, out } = await run(forgetful, [command], { env: { HELLO_HOME: data } });
    const answer = answerIn(out, z.unknown());
    const codes = answer.issues?.map(issue => issue.code);
    assert.deepEqual([exit, answer.kind, codes], [2, 'bug', ['DECLARATION']], command);
    const said = `hello ${use} the stored kind friend, and does not list it in stored`;
    assert.equal(answer.issues?.[0]?.message, said, command);
  }
  // the listing is checked before the read, so a missing file does not hide it
  const empty = await mkdtemp(join(tmpdir(), 'adx-stored-'));
  t.after(() => rm(empty, { recursive: true, force: true }));
  const missing = answerIn(
    (await run(forgetful, ['peek'], { env: { HELLO_HOME: empty } })).out,
    z.unknown(),
  );
  assert.deepEqual(
    missing.issues?.map(issue => issue.code),
    ['DECLARATION'],
  );
  // a stringify that is refused writes nothing, neither a new file nor over an old one
  const saving = await run(forgetful, ['save'], { env: { HELLO_HOME: empty } });
  const saved = answerIn(saving.out, z.unknown());
  assert.deepEqual(
    [saving.exit, saved.kind, saved.issues?.map(issue => [issue.code, issue.message])],
    [
      2,
      'bug',
      [['DECLARATION', 'hello writes the stored kind friend, and does not list it in stored']],
    ],
  );
  assert.deepEqual(await readdir(empty), []);
  assert.equal(
    await readFile(join(data, 'friends', 'ada.json'), 'utf8'),
    '{"name":"ada","lang":"de"}',
  );
  // the tool starts, since adx cannot see at startup which kinds a handler reads or writes
  assert.equal((await run(forgetful, [], { env: { HELLO_HOME: data } })).exit, 0);
  // a tool that lists the kind stringifies it in a call
  const learned = await run(hello, ['learn'], { env: { HELLO_HOME: data } });
  assert.equal(learned.exit, 0);
  assert.equal(
    await readFile(join(data, 'friends', 'ada.json'), 'utf8'),
    '{"version":2,"name":"ada","langs":["de","eo"]}',
  );
});

test('a step up that throws flies on as a bug of the tool, UNKNOWN_ERROR with exit 2', async t => {
  const data = await holding(t, '{"name":"ada","lang":"de"}');
  assert.deepEqual(await called(data, 'broken'), [2, 'bug', 'UNKNOWN_ERROR', false]);
});
