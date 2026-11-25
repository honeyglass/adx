import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { check, code, effect, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const Colleague = z.strictObject({
  team: z.string(),
  since: z.number().default(2020),
});
const Relative = z.object({ relation: z.string() });
const Item = z.union([Colleague, Relative]);

const unknownFriend = code('UNKNOWN_FRIEND', 'fix', 'Name a friend you added');

const describe = effect({
  does: 'says more about a friend',
  input: z.object({ name: z.string(), about: z.unknown(), kin: z.unknown().optional() }),
  plan: ({ name, about, kin }, { refuse }) => {
    const said = check(Colleague, about, ['about']);
    const related = check(Relative, kin ?? { relation: 'none' }, ['kin']);
    const known = name === 'ada' ? [] : [unknownFriend.at('name', `${name} is no friend`)];
    const issues = [...(said.issues ?? []), ...(related.issues ?? []), ...known];
    const [first, ...rest] = issues;
    if (first !== undefined) return refuse(first, ...rest);
    return { about: said.data };
  },
});

const relate = effect({
  does: 'says how a friend is related',
  input: z.object({ about: z.unknown(), as: z.enum(['item', 'none']) }),
  plan: ({ about, as }, { refuse }) => {
    const options = as === 'item' ? { as: Item } : { as: z.object({}) };
    const said = check(Relative, about, ['about'], options);
    if (said.issues !== null) return refuse(...said.issues);
    return { about: said.data };
  },
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  shapes: { colleague: Colleague, item: Item },
  commands: { friends: { describe, relate } },
});

const issuesOf = async (...argv: string[]) => {
  const { exit, out } = await run(hello, argv);
  const answer = answerIn(out, z.unknown());
  return { exit, issues: answer.issues?.map(i => [i.code, i.path, i.command]), answer };
};

test('check answers the checked value, with its defaults, and no issues', () => {
  assert.deepEqual(check(Colleague, { team: 'billing' }, ['about']), {
    data: { team: 'billing', since: 2020 },
    issues: null,
  });
});

test('check answers one SCHEMA issue per problem, at the path plus the place inside the part', () => {
  const said = check(Colleague, { team: 7, since: 'x', extra: 1 }, ['people', 2, 'about']);
  assert.equal(said.data, null);
  assert.deepEqual(
    said.issues?.map(issue => [issue.code, issue.path]),
    [
      ['SCHEMA', ['people', 2, 'about', 'team']],
      ['SCHEMA', ['people', 2, 'about', 'since']],
      ['SCHEMA', ['people', 2, 'about', 'extra']],
    ],
  );
  assert.deepEqual(
    check(Colleague, 'billing', ['about']).issues?.map(i => i.path),
    [['about']],
  );
  const nested = check(z.object({ lead: Relative }), { lead: { relation: 'x', relatoin: 'y' } }, [
    'about',
  ]);
  assert.deepEqual(
    [nested.data, nested.issues?.map(issue => [issue.code, issue.path])],
    [null, [['SCHEMA', ['about', 'lead', 'relatoin']]]],
  );
});

test('the issues of check name the shape the tool lists, else the command that ran', async () => {
  const refused = await issuesOf(
    'friends',
    'describe',
    '--json',
    '{"name":"ada","about":{"team":7},"kin":{}}',
  );
  assert.equal(refused.exit, 1);
  assert.deepEqual(refused.issues, [
    ['SCHEMA', 'about.team', 'hello schema colleague'],
    ['SCHEMA', 'kin.relation', 'hello schema friends describe'],
  ]);
});

test('the issues of several checks and of a tool code stand in one answer', async () => {
  const refused = await issuesOf('friends', 'describe', '--json', '{"name":"bob","about":{}}');
  assert.deepEqual(refused.issues, [
    ['SCHEMA', 'about.team', 'hello schema colleague'],
    ['UNKNOWN_FRIEND', 'name', undefined],
  ]);
});

test('with as, the issues name that shape, and the value is still checked against the first', async () => {
  const listed = await issuesOf(
    'friends',
    'relate',
    '--as',
    'item',
    '--json',
    '{"about":{"team":"x"}}',
  );
  assert.deepEqual(listed.issues, [
    ['SCHEMA', 'about.team', 'hello schema item'],
    ['SCHEMA', 'about.relation', 'hello schema item'],
  ]);
  const unlisted = await issuesOf('friends', 'relate', '--as', 'none', '--json', '{"about":{}}');
  assert.deepEqual(unlisted.issues, [['SCHEMA', 'about.relation', 'hello schema friends relate']]);
});

test('check refuses an unknown key and a line break through a lazy and an intersection schema', () => {
  const Lazy = z.lazy(() => z.object({ name: z.string() }));
  const Both = z.intersection(z.object({ name: z.string() }), z.object({ lead: Relative }));
  const cases: [z.ZodType, unknown, (string | number)[][]][] = [
    [Lazy, { name: 'ada', extra: 1 }, [['about', 'extra']]],
    [Lazy, { name: 'a\nb' }, [['about', 'name']]],
    [Both, { name: 'ada', lead: { relation: 'x' }, extra: 1 }, [['about', 'extra']]],
    [
      Both,
      { name: 'ada', lead: { relation: 'x', relatoin: 'y' } },
      [['about', 'lead', 'relatoin']],
    ],
    [Both, { name: 'a\nb', lead: { relation: 'x' } }, [['about', 'name']]],
    [Both, { name: 'ada', lead: { relation: 'x\ny' } }, [['about', 'lead', 'relation']]],
  ];
  for (const [shape, value, paths] of cases) {
    const said = check(shape, value, ['about']);
    assert.deepEqual(
      [said.data, said.issues?.map(issue => issue.path)],
      [null, paths],
      JSON.stringify(value),
    );
  }
  assert.deepEqual(check(Both, { name: 'ada', lead: { relation: 'x' } }, ['about']).issues, null);
  // after a preprocess, both sides read the value the preprocess made
  const Renamed = z.preprocess(
    value => (isRecord(value) ? { name: value.N, lead: value.L } : value),
    Both,
  );
  const renamed = check(Renamed, { N: 'ada', L: { relation: 'x' } }, ['about']);
  assert.deepEqual(renamed, { data: { name: 'ada', lead: { relation: 'x' } }, issues: null });
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

test('a schema kind the check cannot look into is a DECLARATION error, never let through', async () => {
  // in the input of a command, at startup, whatever the call gives
  const kept = effect({
    does: 'keeps a value',
    input: z.object({ value: z.custom<object>(() => true).optional() }),
    plan: ({ value }) => ({ value }),
  });
  const keeping = tool({ name: 'keeping', version: '0.1.0', does: 'x', commands: { kept } });
  const started = answerIn((await run(keeping, [])).out, z.unknown());
  assert.deepEqual(
    started.issues?.map(i => i.code),
    ['DECLARATION'],
  );
  // in a check of the handler, where the call runs, whose state adx then cannot know
  const peek = effect({
    does: 'peeks into a value',
    input: z.object({ value: z.unknown() }),
    plan: ({ value }, { refuse }) => {
      const said = check(z.set(z.string()), value, ['value']);
      return said.issues === null ? {} : refuse(...said.issues);
    },
  });
  const odd = tool({ name: 'odd', version: '0.1.0', does: 'x', commands: { peek } });
  const ran = await run(odd, ['peek', '--json', '{"value":{"a":"x\\ny"}}', '--dry-run']);
  const answer = answerIn(ran.out, z.unknown());
  assert.deepEqual(
    [ran.exit, answer.issues?.map(i => i.code), answer.state],
    [2, ['DECLARATION'], 'The call stopped at an error; what it changed before is not known.'],
  );
});
