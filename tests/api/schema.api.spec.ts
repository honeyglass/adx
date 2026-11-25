import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { code, effect, global, read, stored, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const Person = z.object({
  name: z.string().describe('who to greet'),
  lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
});
const Team = z.object({ title: z.string(), lead: Person });
const Profile = z.object({ cv: z.string() });
const Cat = z.object({ kind: z.literal('cat'), lives: z.number() });
const Dog = z.object({ kind: z.literal('dog'), name: z.string() });
const Friend = stored('friend', 2, z.object({ langs: z.array(z.string()) })).from(
  1,
  z.object({ lang: z.string() }),
  old => ({ langs: [old.lang] }),
);

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
  }),
  example: { name: 'Ada' },
  output: z.object({ greeting: z.string() }),
  run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
});

const greetAll = read({
  does: 'greets several people',
  input: z.object({
    people: z.array(Person).describe('the people to greet'),
    teams: z.array(Team).optional(),
    guest: Person.optional(),
    note: z.object({ text: z.string() }).optional(),
    pet: z.discriminatedUnion('kind', [Cat, Dog]).optional(),
    pair: z.tuple([z.string(), Person]).optional(),
    parsed: z.preprocess(value => value, Person).optional(),
    vip: Person.describe('a copy, which is no shape').optional(),
    tags: z.record(z.string(), z.string()).optional(),
    extra: z.looseObject({ id: z.string() }).optional(),
  }),
  run: ({ people }) => ({ greeted: people.length }),
});

const setProfile = effect({
  does: 'sets a profile',
  input: z.object({ name: z.string() }),
  plan: ({ name }) => ({ name }),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  shapes: { person: Person, team: Team, profile: Profile, cat: Cat },
  stored: [Friend],
  commands: { greet, 'greet-all': greetAll, profile: { set: setProfile } },
});

const answerOf = async (tool: typeof hello, ...argv: string[]) => {
  const { exit, out } = await run(tool, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

const Overview = z.object({
  commands: z.array(z.object({ command: z.string(), does: z.string(), input: z.unknown() })),
  shapes: z.array(z.string()),
  stored: z.array(z.object({ name: z.string(), version: z.number() })),
  kinds: z.record(z.string(), z.object({ exit: z.number(), does: z.string() })),
  codes: z.array(z.object({ code: z.string(), kind: z.string(), hint: z.string() })),
});

test('schema alone names every command with its input, the shapes, the stored kinds with their format numbers, the kinds and the codes', async () => {
  const { exit, out } = await run(hello, ['schema']);
  const schema = answerIn(out, Overview).result;
  assert.equal(exit, 0);
  assert.deepEqual(
    schema?.commands.map(c => c.command),
    ['hello greet', 'hello greet-all', 'hello profile set'],
  );
  assert.deepEqual(schema?.commands[0]?.input, {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'who to greet' },
      lang: {
        type: 'string',
        enum: ['en', 'de', 'eo'],
        default: 'en',
        description: 'the language code',
      },
    },
    required: ['name'],
  });
  assert.deepEqual(schema?.shapes, ['person', 'team', 'profile', 'cat']);
  assert.deepEqual(schema?.stored, [{ name: 'friend', version: 2 }]);
  assert.deepEqual(schema?.kinds.ask, {
    exit: 1,
    does: 'only the person can solve it: stop and ask',
  });
  assert.deepEqual(
    Object.entries(schema?.kinds ?? {}).map(([kind, { exit }]) => [kind, exit]),
    [
      ['fix', 1],
      ['ask', 1],
      ['retry', 1],
      ['bug', 2],
    ],
  );
  assert.deepEqual(schema?.codes[0], {
    code: 'UNKNOWN_COMMAND',
    kind: 'fix',
    hint: 'Use a command the tool lists',
  });
  const codes = schema?.codes.map(c => [c.code, c.kind]);
  assert.deepEqual(
    ['SCHEMA', 'MISSING_INPUT', 'INPUT_TOO_LARGE', 'NEWER_VERSION', 'DECLARATION'].map(name =>
      codes?.find(([code]) => code === name),
    ),
    [
      ['SCHEMA', 'fix'],
      ['MISSING_INPUT', 'fix'],
      ['INPUT_TOO_LARGE', 'fix'],
      ['NEWER_VERSION', 'ask'],
      ['DECLARATION', 'bug'],
    ],
  );
});

test('schema of a command shows its input as JSON Schema, what it takes and its example', async () => {
  const { exit, result } = await answerOf(hello, 'schema', 'greet');
  assert.equal(exit, 0);
  const Shown = z.object({
    command: z.string(),
    input: z.object({ required: z.array(z.string()) }),
    options: z.array(z.object({ option: z.string() })),
    lists: z.array(z.string()),
    output: z.object({ required: z.array(z.string()) }),
    example: z.unknown(),
  });
  const shown = Shown.parse(result);
  assert.deepEqual(
    [shown.command, shown.input.required, shown.lists, shown.output.required, shown.example],
    ['hello greet', ['name'], ['lang'], ['greeting'], { name: 'Ada' }],
  );
  assert.deepEqual(
    shown.options.map(o => o.option),
    ['--json', '--output', '--help', '--fields'],
  );
});

test('schema of a command names the global fields it takes', async () => {
  const project = global({ input: z.object({ project: z.string() }), example: { project: 'web' } });
  const tracker = tool({
    name: 'tracker',
    version: '0.1.0',
    does: 'tracks',
    global: project,
    commands: {
      show: project.read({ does: 'shows', input: z.object({ id: z.string() }), run: () => ({}) }),
      whoami: project.read({ does: 'names you', global: false, run: () => ({}) }),
    },
  });
  const Global = z.object({
    global: z.array(z.string()),
    input: z.object({ required: z.array(z.string()) }),
  });
  const show = Global.parse((await answerOf(tracker, 'schema', 'show')).result);
  assert.deepEqual([show.global, show.input.required], [['project'], ['id', 'project']]);
  const Whoami = z.object({ global: z.array(z.string()), input: z.unknown() });
  const whoami = Whoami.parse((await answerOf(tracker, 'schema', 'whoami')).result);
  assert.deepEqual(whoami.global, []);
  assert.deepEqual(whoami.input, {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {},
  });
});

test('schema of a shape prints it as JSON Schema; a shape wins over a group of its word', async () => {
  const person = await answerOf(hello, 'schema', 'person');
  assert.equal(person.exit, 0);
  assert.deepEqual(person.result, {
    shape: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: { type: 'string', description: 'who to greet' },
        lang: {
          type: 'string',
          enum: ['en', 'de', 'eo'],
          default: 'en',
          description: 'the language code',
        },
      },
      required: ['name'],
    },
  });
  const profile = await answerOf(hello, 'schema', 'profile');
  assert.deepEqual(Object.keys(z.record(z.string(), z.unknown()).parse(profile.result)), ['shape']);
  const set = await answerOf(hello, 'schema', 'profile', 'set');
  assert.equal(z.object({ command: z.string() }).parse(set.result).command, 'hello profile set');
});

test('schema refuses a name it does not know, and any option', async () => {
  for (const argv of [
    ['schema', 'nope'],
    ['schema', 'greet', 'nope'],
    ['schema', 'toString'],
  ]) {
    const unknown = await answerOf(hello, ...argv);
    assert.deepEqual(
      [unknown.exit, unknown.issues?.map(i => [i.code, i.command])],
      [1, [['UNKNOWN_COMMAND', 'hello schema']]],
    );
  }
  const option = await answerOf(hello, 'schema', 'greet', '--json', '{}');
  assert.deepEqual(
    [option.exit, option.issues?.map(i => [i.code, i.path, i.command])],
    [1, [['UNKNOWN_OPTION', 'json', 'hello schema']]],
  );
});

test('a SCHEMA issue names the innermost shape its part lies in, else the command', async () => {
  const cases = [
    ['{"people":[{"name":"Ada","lang":"xx"}]}', 'people.0.lang', 'hello schema person'],
    ['{"people":[],"guest":{"name":7}}', 'guest.name', 'hello schema person'],
    ['{"people":[],"teams":[{"title":"x","lead":{}}]}', 'teams.0.lead.name', 'hello schema person'],
    ['{"people":[],"teams":[{"lead":{"name":"Ada"}}]}', 'teams.0.title', 'hello schema team'],
    ['{"people":[],"note":{"text":1}}', 'note.text', 'hello schema greet-all'],
    ['{"people":"Ada"}', 'people', 'hello schema greet-all'],
    ['{"people":[],"pet":{"kind":"cat","lives":"9"}}', 'pet.lives', 'hello schema cat'],
    ['{"people":[],"pet":{"kind":"dog","name":1}}', 'pet.name', 'hello schema greet-all'],
    ['{"people":[],"pair":["a",{"name":1}]}', 'pair.1.name', 'hello schema person'],
    ['{"people":[],"parsed":{"name":1}}', 'parsed.name', 'hello schema person'],
    ['{"people":[],"vip":{"name":1}}', 'vip.name', 'hello schema greet-all'],
  ];
  for (const [json, path, command] of cases) {
    const refused = await answerOf(hello, 'greet-all', '--json', json ?? '');
    assert.deepEqual(
      [json, refused.exit, refused.issues?.map(i => [i.code, i.path, i.command])],
      [json, 1, [['SCHEMA', path, command]]],
    );
  }
});

test('an unknown key is refused at any depth, at its path; a record and a loose object keep theirs', async () => {
  const cases = [
    ['{"people":[{"name":"Ada","lnag":"de"}]}', 'people.0.lnag', 'hello schema person'],
    ['{"people":[],"pet":{"kind":"cat","lives":9,"age":3}}', 'pet.age', 'hello schema cat'],
    ['{"people":[],"note":{"text":"x","txet":"y"}}', 'note.txet', 'hello schema greet-all'],
    ['{"people":[],"nmae":"Ada"}', 'nmae', 'hello schema greet-all'],
  ];
  for (const [json, path, command] of cases) {
    const refused = await answerOf(hello, 'greet-all', '--json', json ?? '');
    assert.deepEqual(
      [json, refused.exit, refused.issues?.map(i => [i.code, i.path, i.command])],
      [json, 1, [['SCHEMA', path, command]]],
    );
  }
  const kept = '{"people":[],"tags":{"a":"b"},"extra":{"id":"x","more":1}}';
  assert.deepEqual((await answerOf(hello, 'greet-all', '--json', kept)).result, { greeted: 0 });
});

test('a shape that is no word, or the word of a command, is a DECLARATION error', async () => {
  const cases: Record<string, z.ZodType>[] = [{ 'my person': Person }, { greet: Person }];
  for (const shapes of cases) {
    const broken = tool({ ...spec(), shapes });
    const answer = await answerOf(broken, 'greet', '--name', 'Ada');
    assert.deepEqual([answer.exit, answer.issues?.map(i => i.code)], [2, ['DECLARATION']]);
  }
});

test('a command or a group named schema at the top is a DECLARATION error, schemas or a nested one is not', async () => {
  // each tool gets commands of its own, since one command in two places is a DECLARATION too
  const greet = () => spec().commands.greet;
  const hidden = [
    { greet: greet(), schema: greet() },
    { greet: greet(), schema: { show: greet() } },
  ];
  for (const commands of hidden) {
    const answer = await answerOf(tool({ ...spec(), commands }), 'greet', '--name', 'Ada');
    assert.deepEqual([answer.exit, answer.issues?.map(i => i.code)], [2, ['DECLARATION']]);
    assert.match(answer.issues?.[0]?.message ?? '', /schema hides it/);
  }
  const near = tool({ ...spec(), commands: { greet: greet(), schemas: greet() } });
  assert.equal((await answerOf(near, 'schemas', '--name', 'Ada')).exit, 0);
  // adx's own schema takes only the first word, so a nested schema stays reachable
  const nested = tool({ ...spec(), commands: { greet: greet(), profile: { schema: greet() } } });
  assert.equal((await answerOf(nested, 'profile', 'schema', '--name', 'Ada')).exit, 0);
});

test('a tool code at a part keeps its own command, not the schema of a shape', async () => {
  const twice = code('NAME_TWICE', 'fix', 'Name each person once');
  const checked = read({
    does: 'greets several people',
    input: z.object({ people: z.array(Person) }),
    check: ({ people }) => (people.length > 1 ? [twice.at(['people', 1, 'name'])] : []),
    run: () => ({}),
  });
  const tooled = tool({ ...spec(), shapes: { person: Person }, commands: { checked } });
  const refused = await answerOf(
    tooled,
    'checked',
    '--json',
    '{"people":[{"name":"a"},{"name":"b"}]}',
  );
  assert.deepEqual(
    refused.issues?.map(i => [i.code, i.path, i.command]),
    [['NAME_TWICE', 'people.1.name', undefined]],
  );
});

// A tool of its own commands, since a command stands in one tool.
function spec() {
  const greet = read({ does: 'greets', input: z.object({ name: z.string() }), run: () => ({}) });
  return { name: 'hello', version: '0.1.0', does: 'greets people', commands: { greet } };
}
