import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import {
  after,
  code,
  effect,
  global,
  hint,
  multiline,
  read,
  schema,
  tell,
  tool,
} from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string(),
    lang: z.string().default('en'),
    style: z.enum(['casual', 'formal']).default('casual'),
  }),
  run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
});

const add = effect({
  does: 'remembers a friend',
  input: z.object({ name: z.string(), lang: z.string() }),
  plan: friend => friend,
  next: (_, friend) => [greet.step({ lang: friend.lang }), tell('wave to the friend')],
});

const note = read({
  does: 'notes a name',
  input: z.object({ text: multiline() }),
  run: ({ text }) => ({ text }),
  next: (_, { text }) => [greet.step({ name: text }).needs('style')],
});

const find = read({
  does: 'finds friends',
  input: z.object({
    tags: z.array(z.string()),
    limit: z.number(),
    exact: z.boolean().optional(),
    near: z.object({ city: z.string() }).optional(),
  }),
  run: () => ({ found: 0 }),
});

// Every form a value takes on the command line, one step each.
const probe = read({
  does: 'names steps',
  run: () => ({}),
  next: () => [
    greet.step({ name: "Ada O'Hara" }),
    greet.step({ name: '-x' }),
    greet.step({ name: '' }),
    find.step({ tags: ['a', 'b c'], limit: 3, exact: true }),
    find.step({ exact: false, near: { city: 'Rome' } }),
    greet.step({ name: '=ls' }),
    greet.step({ name: '~ada' }),
    find.step({ tags: ['a'], limit: 1e21 }),
    find.step({ tags: ['a'], limit: 1e-7 }),
  ],
});

const unknownBlock = code('UNKNOWN_BLOCK', 'fix', 'Use a block the CV has');

const show = read({
  does: 'shows a CV',
  input: z.object({ cv: z.string().regex(/^[a-z]+$/), block: z.string() }),
  values: { block: () => [{ value: 'awards' }] },
  run: ({ cv, block }) => ({ cv, block }),
});

const apply = effect({
  does: 'applies an edit',
  input: z.object({ cv: z.string().optional(), block: z.string() }),
  check: ({ block }) => (block === 'x' ? [unknownBlock.at('block', 'x is no block')] : []),
  plan: ({ block }, { refuse }) => refuse(unknownBlock.at('block', `${block} is no block`)),
});

const move = effect({
  does: 'moves a block',
  input: z.object({ cv: z.string(), block: z.string() }),
  plan: ({ block }, { refuse }) =>
    refuse(unknownBlock.at('block', `${block} is no block`).command(greet.step({ name: 'x' }))),
});

const broken = code('BROKEN', 'bug', 'Tell the person');
const lost = code('LOST', 'bug', 'Tell the person');

const crash = read({
  does: 'breaks',
  input: z.object({ which: z.enum(['own', 'hinted']) }),
  run: ({ which }, { refuse }) =>
    which === 'own'
      ? refuse(broken.issue('it broke').command(show.step({ cv: 'x' })))
      : refuse(lost.issue('it got lost')),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { greet, note, find, probe, show, apply, move, crash, friends: { add } },
  next: [
    after(add, (_, { name }) => [tell(`tell ${name} hello`)]),
    after([add, note], () => [tell('after either')]),
  ],
  hints: [
    hint(unknownBlock, () => show.step().carry('cv', 'block').lists('block')),
    hint(lost, () => show.step()),
  ],
});

const answerOf = async (made: typeof hello, ...argv: string[]) => {
  const { exit, out } = await run(made, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

const commandsOf = (answer: { next?: { command?: string }[] }) =>
  answer.next?.map(step => step.command);

test('next names a command with the fields it gives, and needs the required ones it leaves open', async () => {
  const { exit, next } = await answerOf(hello, 'friends', 'add', '--name', 'bob', '--lang', 'de');
  assert.equal(exit, 0);
  assert.deepEqual(next?.slice(0, 2), [
    { does: 'greets one person', command: 'hello greet --lang de', needs: ['name'] },
    { does: 'wave to the friend' },
  ]);
});

test('a step needs an optional field only when it says so', async () => {
  const { next } = await answerOf(hello, 'note', '--text', 'Ada');
  assert.deepEqual(next?.[0], {
    does: 'greets one person',
    command: 'hello greet --name Ada',
    needs: ['style'],
  });
});

test('every value is written for the shell: quoted, after = when it starts with a dash, repeated, as a switch, or in --json', async () => {
  const answer = await answerOf(hello, 'probe');
  assert.deepEqual(commandsOf(answer), [
    "hello greet --name 'Ada O'\\''Hara'",
    'hello greet --name=-x',
    "hello greet --name ''",
    "hello find --tags a --tags 'b c' --limit 3 --exact",
    `hello find --json '{"exact":false,"near":{"city":"Rome"}}'`,
    "hello greet --name '=ls'",
    "hello greet --name '~ada'",
    `hello find --tags a --json '{"limit":1e+21}'`,
    `hello find --tags a --json '{"limit":1e-7}'`,
  ]);
  assert.deepEqual(answer.next?.[4]?.needs, ['tags', 'limit']);
});

test('a dry run answers the step that runs the same call for real, and no other', async () => {
  const argv = ['friends', 'add', '--name', 'bob b', '--lang', 'de', '--dry-run'];
  const { next } = await answerOf(hello, ...argv);
  assert.deepEqual(next, [
    { does: 'remembers a friend', command: "hello friends add --name 'bob b' --lang de" },
  ]);
});

test('after adds its steps behind the own ones, for one command and for a list, in their order', async () => {
  const added = await answerOf(hello, 'friends', 'add', '--name', 'bob', '--lang', 'de');
  assert.deepEqual(
    added.next?.map(step => step.does),
    ['greets one person', 'wave to the friend', 'tell bob hello', 'after either'],
  );
  const noted = await answerOf(hello, 'note', '--text', 'Ada');
  assert.deepEqual(
    noted.next?.map(step => step.does),
    ['greets one person', 'after either'],
  );
});

test('invoke answers the steps the tool prints', async () => {
  const answer = await add.invoke({ name: 'bob', lang: 'de' });
  assert.deepEqual(answer.next?.[0], {
    does: 'greets one person',
    command: 'hello greet --lang de',
    needs: ['name'],
  });
  assert.equal(answer.next?.length, 4);
});

test('a line break in a step at a terminal is escaped, so each step keeps one line', async () => {
  const { out } = await run(hello, ['note', '--text', 'A\nB'], { tty: true });
  assert.ok(out.includes("  hello greet --name 'A\\u{a}B'   greets one person; needs style\n"));
});

test('a success at a terminal prints its next steps below the result', async () => {
  const { out } = await run(hello, ['note', '--text', 'Ada'], { tty: true });
  assert.equal(
    out,
    [
      'text  Ada',
      '',
      'Next:',
      '  hello greet --name Ada   greets one person; needs style',
      '  after either',
      '',
    ].join('\n'),
  );
});

test('a hint gives every issue of its code the command that helps, unless the issue names one', async () => {
  const handler = await answerOf(hello, 'apply', '--cv', 'jane', '--block', 'nobody');
  assert.equal(handler.exit, 1);
  assert.deepEqual(
    handler.issues?.map(i => [i.code, i.path, i.command]),
    [['UNKNOWN_BLOCK', 'block', 'hello show --cv jane --block']],
  );
  const checked = await answerOf(hello, 'apply', '--cv', 'jane', '--block', 'x');
  assert.equal(checked.issues?.[0]?.command, 'hello show --cv jane --block');
  const own = await answerOf(hello, 'move', '--cv', 'jane', '--block', 'nobody');
  assert.equal(own.issues?.[0]?.command, 'hello greet --name x');
});

test('a refusal of kind bug names the command of its issue, and the hint of its code', async () => {
  const own = await run(hello, ['crash', '--which', 'own']);
  const answer = answerIn(own.out, z.unknown());
  assert.deepEqual(
    [own.exit, answer.kind, answer.issues?.[0]?.command],
    [2, 'bug', 'hello show --cv x'],
  );
  assert.match(own.err, /BROKEN/);
  const hinted = await answerOf(hello, 'crash', '--which', 'hinted');
  assert.equal(hinted.issues?.[0]?.command, 'hello show');
});

test('carry takes a field of the refused call only when the target accepts its value', async () => {
  const failsSchema = await answerOf(hello, 'apply', '--cv', 'Jane!', '--block', 'nobody');
  assert.equal(failsSchema.issues?.[0]?.command, 'hello show --block');
  const notGiven = await answerOf(hello, 'apply', '--block', 'nobody');
  assert.equal(notGiven.issues?.[0]?.command, 'hello show --block');
  const invoked = await apply.invoke({ cv: 'jane', block: 'nobody' });
  assert.equal(invoked.issues?.[0]?.command, 'hello show --cv jane --block');
});

test('a step carries the global fields of the call into a command that takes them', async () => {
  const project = global({ input: z.object({ project: z.string() }), example: { project: 'web' } });
  const noTeam = code('NO_TEAM', 'fix', 'Pick a team the project has');
  const ticket = project.read({
    does: 'shows a ticket',
    input: z.object({ id: z.number() }),
    run: ({ id }) => ({ id }),
  });
  const whoami = project.read({
    does: 'names the user',
    global: false,
    run: () => ({ user: 'ada' }),
    next: () => [ticket.step()],
  });
  const labels = project.read({
    does: 'lists labels',
    input: z.object({ team: z.string().optional() }),
    run: ({ team }, { refuse }) => (team === 'none' ? refuse(noTeam.at('team')) : { team }),
    next: () => [ticket.step({ id: 7 }), whoami.step()],
  });
  const tracker = tool({
    name: 'tracker',
    version: '1.0.0',
    does: 'files tickets',
    global: project,
    commands: { labels, whoami, ticket },
    hints: [hint(noTeam, () => ticket.step())],
  });
  const listed = await answerOf(tracker, 'labels', '--team', 'core', '--project', 'web shop');
  assert.deepEqual(commandsOf(listed), [
    "tracker ticket --project 'web shop' --id 7",
    'tracker whoami',
  ]);
  const named = await answerOf(tracker, 'whoami');
  assert.deepEqual(named.next, [
    { does: 'shows a ticket', command: 'tracker ticket', needs: ['project', 'id'] },
  ]);
  const refused = await answerOf(tracker, 'labels', '--team', 'none', '--project', 'web');
  assert.equal(refused.issues?.[0]?.command, 'tracker ticket --project web');
});

// A command stands in one tool only, so each tool below lists commands of its own.
const greetOne = () => read({ does: 'greets one person', run: () => ({}) });

test('the tool alone answers its name, version, commands and the step to schema', async () => {
  const solo = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'greets people',
    commands: { greet: greetOne() },
  });
  const { exit, ok, result, next } = await answerOf(solo);
  assert.deepEqual(
    { exit, ok, result, next },
    {
      exit: 0,
      ok: true,
      result: {
        name: 'hello',
        version: '0.1.0',
        does: 'greets people',
        skill: null,
        commands: [{ command: 'hello greet', does: 'greets one person' }],
      },
      next: [{ does: 'shows every command and its input', command: 'hello schema' }],
    },
  );
  const { out } = await run(solo, [], { tty: true });
  assert.equal(
    out,
    [
      'hello 0.1.0: greets people',
      '',
      'Commands:',
      '  greet   greets one person',
      '',
      'Next:',
      '  hello schema   shows every command and its input',
      '',
    ].join('\n'),
  );
});

test('start names the first steps, among them a step to schema', async () => {
  const remember = effect({
    does: 'remembers a friend',
    input: z.object({ name: z.string(), lang: z.string() }),
    plan: friend => friend,
  });
  const started = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'greets people',
    commands: { friends: { add: remember } },
    start: async () => [remember.step(), schema.step('friends add')],
  });
  const { next } = await answerOf(started);
  assert.deepEqual(next, [
    { does: 'remembers a friend', command: 'hello friends add', needs: ['name', 'lang'] },
    { does: 'shows the schema of friends add', command: 'hello schema friends add' },
  ]);
});

test('an after or a step that names a command the tool does not list, and two hints for one code, are DECLARATION errors', async () => {
  const stray = read({ does: 'is listed nowhere', run: () => ({}) });
  const named = read({ does: 'names a stray step', run: () => ({}), next: () => [stray.step()] });
  const followed = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'greets people',
    commands: { greet: greetOne() },
    next: [after(stray, () => [])],
  });
  const declared = await answerOf(followed, 'greet');
  assert.deepEqual([declared.exit, declared.issues?.map(i => i.code)], [2, ['DECLARATION']]);
  const twice = code('TWICE', 'fix', 'x');
  const hinted = tool({
    name: 'hello',
    version: '0.1.0',
    does: 'x',
    commands: { greet: greetOne() },
    hints: [hint(twice, () => greet.step()), hint(twice, () => note.step())],
  });
  const doubled = await answerOf(hinted, 'greet');
  assert.deepEqual([doubled.exit, doubled.issues?.map(i => i.code)], [2, ['DECLARATION']]);
  const stepped = tool({ name: 'hello', version: '0.1.0', does: 'x', commands: { named } });
  const answered = await answerOf(stepped, 'named');
  assert.deepEqual([answered.exit, answered.issues?.map(i => i.code)], [2, ['DECLARATION']]);
});
