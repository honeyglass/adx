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
