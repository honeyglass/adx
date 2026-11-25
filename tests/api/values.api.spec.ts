import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import {
  code,
  detailOf,
  effect,
  fresh,
  global,
  hint,
  keyOf,
  list,
  needs,
  read,
  tool,
} from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { RefusalError } from '@honeyglass/utils/ts';
import { answerIn } from '../utils/answer.ts';

const LANGS = [
  { value: 'en', does: 'English' },
  { value: 'de', does: 'German' },
];

const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');
const noFormal = code('NO_FORMAL', 'fix', 'Greet casually');
const noShout = code('NO_SHOUT', 'fix', 'Greet quietly');
const noWhisper = code('NO_WHISPER', 'fix', 'Greet aloud');

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string(),
    lang: z.string().default('en'),
    style: z.enum(['casual', 'formal', 'loud', 'quiet']).default('casual'),
    homeTown: z.string().optional(),
    count: z.number().optional(),
  }),
  values: { lang: () => LANGS, homeTown: () => [{ value: 'Rome' }] },
  check: ({ name }) => (name === '' ? [blankName.at('name')] : []),
  run: ({ name, lang, style }, { refuse }) => {
    if (style === 'formal') return refuse(noFormal.at('lang', `${lang} has no formal greeting`));
    if (style === 'loud') return refuse(noShout.at('lang').command(wave.step({ name })));
    if (style === 'quiet') return refuse(noWhisper.at('lang'));
    return { greeting: `${lang} ${name}` };
  },
});

const tag = read({
  does: 'tags a note',
  input: z.object({
    label: z.array(z.string()),
    mood: z.array(z.enum(['calm', 'glad'])).optional(),
  }),
  values: { label: () => [{ value: 'bug' }, { value: 'docs' }] },
  run: ({ label }) => ({ label }),
});

const add = effect({
  does: 'remembers a friend',
  input: z.object({ name: z.string(), lang: z.string() }),
  values: { name: fresh(() => ['ada', 'bob']), lang: () => LANGS },
  plan: friend => friend,
});

const cities: Source<{ region: string }> = ({ region }) =>
  region === undefined ? needs('region') : [{ value: `${region}-a` }];

const visit = read({
  does: 'visits a city',
  input: z.object({ region: z.string().optional(), city: z.string() }),
  values: { city: cities },
  run: ({ city }) => ({ city }),
});

const gone = code('GONE', 'fix', 'Pick another friend');

const wave = read({
  does: 'waves at a friend',
  input: z.object({ name: z.string(), lang: z.string(), city: z.string().optional() }),
  run: (_, { refuse }) => refuse(gone.at('name')),
});

const missed = code('MISSED', 'fix', 'Visit another city');

const leave = read({
  does: 'leaves a city',
  input: z.object({ city: z.string() }),
  run: (_, { refuse }) => refuse(missed.at('city')),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { greet, tag, visit, wave, leave, friends: { add } },
  hints: [
    hint(noShout, () => greet.step()),
    hint(noWhisper, () => greet.step()),
    hint(gone, () => add.step().carry('name', 'lang')),
    hint(missed, () => visit.step().carry('city')),
  ],
});

const project = global({
  input: z.object({ project: z.string() }),
  example: { project: 'web' },
  values: { project: () => [{ value: 'web' }, { value: 'shop' }] },
});

/** Each project the teams source was asked with, so a test sees it never gets an unlisted one. */
const teamsAsked: string[] = [];

const teams: Source<{ project: string }> = ({ project }) => {
  if (project === undefined) return needs('project');
  teamsAsked.push(project);
  return [{ value: `${project}-core` }];
};

const milestones: Source<{ project: string; team: string }> = ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  return [{ value: `${project}/${team}/m1` }];
};

const noTicket = code('TICKET_NOT_FOUND', 'fix', 'Use a key the list answers');

const tickets = project.list({
  does: 'lists the tickets',
  input: z.object({ state: z.string().optional() }),
  item: z.object({ id: z.string() }),
  key: 'id',
  outline: [],
  run: () => ({ items: [] }),
});

const show = project.read({
  does: 'shows one ticket',
  input: z.object({ id: z.string(), state: z.string().optional() }),
  values: { id: detailOf(tickets) },
  run: ({ id }, { refuse }) => (id === 'CW-0' ? refuse(noTicket.at('id')) : { id }),
});

const schedule = project.effect({
  does: 'puts a ticket into a milestone',
  input: z.object({ id: z.string(), team: z.string(), milestone: z.string() }),
  values: { id: keyOf(tickets), team: teams, milestone: milestones },
  plan: ({ id, milestone }) => ({ id, milestone }),
});

const tracker = tool({
  name: 'tracker',
  version: '1.0.0',
  does: 'files tickets',
  global: project,
  commands: { tickets, show, schedule },
});

const boom = code('BOOM', 'fix', 'Try another value');

const flaky = read({
  does: 'reads a field whose source fails',
  input: z.object({ a: z.string(), b: z.string().optional() }),
  values: {
    a: ({ b }) => {
      if (b === 'raw') throw new TypeError('the source broke');
      throw new RefusalError({ kind: 'retry', step: 'a', reason: 'busy', next: 'call again' });
    },
  },
  run: ({ a }) => ({ a }),
});

const refused = read({
  does: 'refuses its field',
  input: z.object({ a: z.string(), b: z.string().optional() }),
  run: (_, { refuse }) => refuse(boom.at('a')),
});

const broken = read({
  does: 'has a source that answers nothing',
  input: z.object({ a: z.string() }),
  values: { a: () => JSON.parse('null') },
  run: ({ a }) => ({ a }),
});

const selfneeds = read({
  does: 'has a source that needs a field the call gave',
  input: z.object({ r: z.string().optional(), a: z.string() }),
  values: { a: () => needs('r') },
  run: ({ a }) => ({ a }),
});

const mark = read({
  does: 'has a value with control characters',
  input: z.object({ mark: z.string() }),
  values: { mark: () => [{ value: 'a\u001b[31m\nb' }] },
  run: ({ mark }) => ({ mark }),
});

const strict = tool({
  name: 'strict',
  version: '1.0.0',
  does: 'has sources that break',
  commands: { flaky, refused, broken, selfneeds, mark },
  hints: [hint(boom, () => flaky.step().carry('a', 'b'))],
});

const answerOf = async (made: typeof hello, ...argv: string[]) => {
  const { exit, out } = await run(made, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

const issuesOf = async (made: typeof hello, ...argv: string[]) => {
  const answer = await answerOf(made, ...argv);
  return answer.issues?.map(i => [i.code, i.path, i.command]);
};

test('an option without its value lists the values of its source, as JSON and as text', async () => {
  const { exit, ok, result, next } = await answerOf(hello, 'greet', '--lang');
  assert.deepEqual(
    { exit, ok, result, next },
    {
      exit: 0,
      ok: true,
      result: { option: 'lang', values: LANGS },
      next: undefined,
    },
  );
  const { out } = await run(hello, ['greet', '--name', 'Ada', '--lang'], { tty: true });
  assert.equal(out, 'option  lang\nvalues  en, de\n');
  const town = await answerOf(hello, 'greet', '--home-town');
  assert.deepEqual(town.result, { option: 'home-town', values: [{ value: 'Rome' }] });
});

test('an enum is a fixed list: alone it lists its values, and a value outside is NOT_IN_LIST', async () => {
  const listed = await answerOf(hello, 'greet', '--style');
  assert.deepEqual(listed.result, {
    option: 'style',
    values: [{ value: 'casual' }, { value: 'formal' }, { value: 'loud' }, { value: 'quiet' }],
  });
  const outside = await answerOf(hello, 'greet', '--name', 'Ada', '--style', 'shy');
  assert.equal(outside.exit, 1);
  assert.deepEqual(
    outside.issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'style', 'hello greet --name Ada --style']],
  );
});

test('a value outside the list of its source is refused with the call that lists the values', async () => {
  const outside = await answerOf(hello, 'greet', '--name', 'Ada', '--lang', 'xx');
  assert.deepEqual([outside.exit, outside.kind, outside.next], [1, 'fix', undefined]);
  assert.deepEqual(
    outside.issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'lang', 'hello greet --name Ada --lang']],
  );
  assert.deepEqual((await answerOf(hello, 'greet', '--name', 'Ada', '--lang', 'de')).result, {
    greeting: 'de Ada',
  });
});

test('each value of an array field is checked, enum or source, at its place in the list', async () => {
  assert.deepEqual(
    await issuesOf(hello, 'tag', '--label', 'bug', '--label', 'nope', '--mood', 'sad'),
    [['NOT_IN_LIST', 'mood.0', 'hello tag --label bug --label nope --mood']],
  );
  assert.deepEqual(await issuesOf(hello, 'tag', '--label', 'bug', '--label', 'nope'), [
    ['NOT_IN_LIST', 'label.1', 'hello tag --label'],
  ]);
});

test('values are checked after the schema and before check', async () => {
  assert.deepEqual(await issuesOf(hello, 'greet', '--lang', 'xx'), [
    ['SCHEMA', 'name', 'hello schema greet'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'greet', '--name', '', '--lang', 'xx'), [
    ['NOT_IN_LIST', 'lang', "hello greet --name '' --lang"],
  ]);
});

test('invoke refuses a value outside the list as the tool does', async () => {
  const answer = await greet.invoke({ name: 'Ada', lang: 'xx' });
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.command]),
    [['NOT_IN_LIST', 'hello greet --name Ada --lang']],
  );
});

test('a listing checks the other fields of the call against their schema first', async () => {
  assert.deepEqual(await issuesOf(hello, 'greet', '--count', 'many', '--lang'), [
    ['SCHEMA', 'count', 'hello schema greet'],
  ]);
});

test('an issue at a field with a source names the call that lists its values, unless a hint or the issue names one', async () => {
  assert.deepEqual(await issuesOf(hello, 'greet', '--name', 'Ada', '--style', 'formal'), [
    ['NO_FORMAL', 'lang', 'hello greet --name Ada --style formal --lang'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'greet', '--name', 'Ada', '--style', 'loud'), [
    ['NO_SHOUT', 'lang', 'hello wave --name Ada'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'greet', '--name', 'Ada', '--style', 'quiet'), [
    ['NO_WHISPER', 'lang', 'hello greet'],
  ]);
});

test('fresh lists the names already taken, and refuses none of them', async () => {
  const listed = await answerOf(hello, 'friends', 'add', '--name');
  assert.deepEqual(listed.result, { option: 'name', taken: ['ada', 'bob'] });
  const { out } = await run(hello, ['friends', 'add', '--name'], { tty: true });
  assert.equal(out, 'option  name\ntaken   ada, bob\n');
  const taken = await answerOf(hello, 'friends', 'add', '--name', 'ada', '--lang', 'de');
  assert.deepEqual([taken.exit, taken.result], [0, { name: 'ada', lang: 'de' }]);
});

test('a source that needs another field refuses with MISSING_VALUE at it, before and after the schema', async () => {
  const answer = await answerOf(hello, 'visit', '--city');
  assert.deepEqual([answer.exit, answer.kind, answer.state], [1, 'fix', 'Nothing was changed.']);
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path, i.command]),
    [['MISSING_VALUE', 'region', undefined]],
  );
  const listed = await answerOf(hello, 'visit', '--region', 'north', '--city');
  assert.deepEqual(listed.result, { option: 'city', values: [{ value: 'north-a' }] });
  assert.deepEqual(await issuesOf(hello, 'visit', '--city', 'rome'), [
    ['MISSING_VALUE', 'region', undefined],
  ]);
});

test('every field a source needs is one issue; a field whose own list needs another names no command', async () => {
  const answer = await answerOf(tracker, 'schedule', '--milestone');
  assert.deepEqual(
    answer.issues?.map(i => [i.code, i.path, i.command]),
    [
      ['MISSING_VALUE', 'project', 'tracker schedule --project'],
      ['MISSING_VALUE', 'team', undefined],
    ],
  );
  // the hint names the field to give first
  assert.match(answer.issues?.[1]?.hint ?? '', /--project/);
  assert.deepEqual(await issuesOf(tracker, 'schedule', '--project', 'shop', '--milestone'), [
    ['MISSING_VALUE', 'team', 'tracker schedule --project shop --team'],
  ]);
  const argv = ['schedule', '--project', 'shop', '--team', 'shop-core', '--milestone'];
  const listed = await answerOf(tracker, ...argv);
  assert.deepEqual(listed.result, {
    option: 'milestone',
    values: [{ value: 'shop/shop-core/m1' }],
  });
});

test('a global field lists the values of the source its global input names', async () => {
  const listed = await answerOf(tracker, 'tickets', '--project');
  assert.deepEqual(listed.result, {
    option: 'project',
    values: [{ value: 'web' }, { value: 'shop' }],
  });
  assert.deepEqual(await issuesOf(tracker, 'tickets', '--project', 'blog'), [
    ['NOT_IN_LIST', 'project', 'tracker tickets --project'],
  ]);
});

test('a key of a list names the list without a value, is not checked against it, and helps its issues', async () => {
  const argv = ['show', '--project', 'web', '--state', 'open', '--id'];
  assert.deepEqual(await issuesOf(tracker, ...argv), [
    ['MISSING_VALUE', 'id', 'tracker tickets --project web --state open'],
  ]);
  const shown = await answerOf(tracker, 'show', '--project', 'web', '--id', 'CW-9');
  assert.deepEqual([shown.exit, shown.result], [0, { id: 'CW-9' }]);
  assert.deepEqual(await issuesOf(tracker, 'show', '--project', 'web', '--id', 'CW-0'), [
    ['TICKET_NOT_FOUND', 'id', 'tracker tickets --project web'],
  ]);
  assert.deepEqual(await issuesOf(tracker, 'schedule', '--project', 'web', '--id'), [
    ['MISSING_VALUE', 'id', 'tracker tickets --project web'],
  ]);
});

test('a keyOf or detailOf of a list the tool does not list is a DECLARATION error at startup', async () => {
  const unlisted = list({
    does: 'lists the codes',
    item: z.object({ code: z.string() }),
    key: 'code',
    outline: ['code'],
    run: () => ({ items: [] }),
  });
  for (const ref of [keyOf(unlisted), detailOf(unlisted)]) {
    const one = read({
      does: 'shows one code',
      input: z.object({ code: z.string() }),
      values: { code: ref },
      run: ({ code }) => ({ code }),
    });
    const made = tool({ name: 'codes', version: '1.0.0', does: 'x', commands: { one } });
    for (const argv of [['one', '--code', 'a'], ['one', '--code'], []]) {
      const answer = await answerOf(made, ...argv);
      assert.deepEqual(
        [argv, answer.exit, answer.issues?.map(i => i.message)],
        [
          argv,
          2,
          ['codes one takes a key of the list that lists the codes, and codes does not list it'],
        ],
      );
    }
  }
});

test('carry takes a value only when it stands in the list, is no taken name, and its source can answer', async () => {
  assert.deepEqual(await issuesOf(hello, 'wave', '--name', 'eve', '--lang', 'de'), [
    ['GONE', 'name', 'hello friends add --name eve --lang de'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'wave', '--name', 'ada', '--lang', 'xx'), [
    ['GONE', 'name', 'hello friends add'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'leave', '--city', 'rome'), [
    ['MISSED', 'city', 'hello visit'],
  ]);
});

test('a source that refuses while a refusal carries its field leaves the value out, and the refusal stands', async () => {
  const answer = await answerOf(strict, 'refused', '--a', 'x');
  assert.deepEqual(
    [answer.exit, answer.kind, answer.issues?.map(i => [i.code, i.command])],
    [1, 'fix', [['BOOM', 'strict flaky']]],
  );
  // an error that is no refusal is a bug of the source, and flies on
  const bug = await answerOf(strict, 'refused', '--a', 'x', '--b', 'raw');
  assert.deepEqual([bug.exit, bug.issues?.[0]?.code], [2, 'UNKNOWN_ERROR']);
});

test('a value goes to the source of another field only once it stands in its own list', async () => {
  teamsAsked.length = 0;
  const argv = ['--project', 'blog', '--team', 'blog-core', '--id', 'CW-1', '--milestone', 'm'];
  assert.deepEqual(await issuesOf(tracker, 'schedule', ...argv), [
    [
      'NOT_IN_LIST',
      'project',
      'tracker schedule --id CW-1 --team blog-core --milestone m --project',
    ],
  ]);
  assert.deepEqual(await issuesOf(tracker, 'schedule', '--project', 'blog', '--team'), [
    ['NOT_IN_LIST', 'project', 'tracker schedule --project'],
  ]);
  assert.deepEqual(teamsAsked, []);
});

test('a source that answers neither a list nor needs() is a DECLARATION bug', async () => {
  for (const argv of [
    ['broken', '--a', 'x'],
    ['broken', '--a'],
  ]) {
    const answer = await answerOf(strict, ...argv);
    assert.deepEqual(
      [argv, answer.exit, answer.kind, answer.issues?.map(i => i.code)],
      [argv, 2, 'bug', ['DECLARATION']],
    );
  }
});

test('a needs() that names a field the source got is a DECLARATION bug', async () => {
  for (const argv of [
    ['selfneeds', '--r', 'q', '--a', 'x'],
    ['selfneeds', '--r', 'q', '--a'],
  ]) {
    const answer = await answerOf(strict, ...argv);
    assert.deepEqual(
      [argv, answer.exit, answer.kind, answer.issues?.map(i => i.code)],
      [argv, 2, 'bug', ['DECLARATION']],
    );
  }
});

test('a listed value at a terminal keeps to its line: line breaks and control characters are escaped', async () => {
  const { out } = await run(strict, ['mark', '--mark'], { tty: true });
  assert.equal(out, 'option  mark\nvalues  a\\u{1b}[31m\\u{a}b\n');
});

test('an option alone lists its values only as the one thing the call asks', async () => {
  assert.deepEqual(await issuesOf(hello, 'greet', '--lang', '--home-town'), [
    ['MISSING_VALUE', 'homeTown', 'hello schema greet'],
  ]);
  assert.deepEqual(await issuesOf(hello, 'friends', 'add', '--name', '--dry-run'), [
    ['UNKNOWN_OPTION', 'dry-run', 'hello schema friends add'],
  ]);
});
