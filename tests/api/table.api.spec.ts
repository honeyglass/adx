import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import {
  bearer,
  cwd,
  effect,
  envDir,
  envUrl,
  global,
  list,
  read,
  remote,
  root,
  stored,
  tool,
} from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const greet = read({ does: 'greets one person', run: () => ({ greeting: 'Hello!' }) });
const add = effect({ does: 'remembers a friend', plan: () => ({ added: true }) });
const count = read({ does: 'counts the friends', run: () => ({ friends: 0 }) });
const show = read({ does: 'shows the friends', run: () => ({ friends: [] }) });

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { greet, friends: { add, count, old: { show } } },
});

const answerOf = async (tool: typeof hello, ...argv: string[]) => {
  const { exit, out } = await run(tool, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

test('a nested table is a group, and its words call its commands', async () => {
  assert.deepEqual((await answerOf(hello, 'friends', 'count')).result, { friends: 0 });
  assert.deepEqual((await answerOf(hello, 'friends', 'old', 'show')).result, { friends: [] });
});

test('a group called alone lists every command below it', async () => {
  const { exit, result } = await answerOf(hello, 'friends');
  assert.equal(exit, 0);
  assert.deepEqual(result, {
    commands: [
      { command: 'hello friends add', does: 'remembers a friend' },
      { command: 'hello friends count', does: 'counts the friends' },
      { command: 'hello friends old show', does: 'shows the friends' },
    ],
  });
  const { out } = await run(hello, ['friends'], { tty: true });
  assert.equal(
    out,
    [
      'hello friends add       remembers a friend',
      'hello friends count     counts the friends',
      'hello friends old show  shows the friends',
      '',
    ].join('\n'),
  );
});

test('an unknown word names the call that lists the words in its place', async () => {
  const top = await answerOf(hello, 'grete');
  assert.equal(top.exit, 1);
  assert.deepEqual(
    top.issues?.map(i => [i.code, i.message, i.command]),
    [['UNKNOWN_COMMAND', 'hello has no command grete', 'hello']],
  );
  const inGroup = await answerOf(hello, 'friends', 'ad', '--name', 'x');
  assert.deepEqual(
    inGroup.issues?.map(i => [i.code, i.message, i.command]),
    [['UNKNOWN_COMMAND', 'hello friends has no command ad', 'hello friends']],
  );
});

test('a word the table holds only by inheritance is no command', async () => {
  const { issues } = await answerOf(hello, 'toString');
  assert.deepEqual(
    issues?.map(i => i.code),
    ['UNKNOWN_COMMAND'],
  );
});

test('a key of more than one word, or with other signs, is a DECLARATION error', async () => {
  const one = read({ does: 'x', run: () => ({}) });
  const two = read({ does: 'x', run: () => ({}) });
  const three = read({ does: 'x', run: () => ({}) });
  const broken = tool({
    name: 'broken',
    version: '0.1.0',
    does: 'x',
    commands: { one, 'add indexed': two, notes: { 'a.b': three } },
  });
  const { exit, kind, issues } = await answerOf(broken, 'one');
  assert.equal(exit, 2);
  assert.equal(kind, 'bug');
  assert.deepEqual(
    issues?.map(i => i.code),
    ['DECLARATION', 'DECLARATION'],
  );
});

test('a tool name, root, stored kind or variable without its form, or a root named like an option of adx, is a DECLARATION error', async () => {
  type Parts = Partial<Parameters<typeof tool>[0]>;
  // a command stands in one tool, so each tool gets its own
  const made = (parts: Parts) =>
    tool({
      name: 'hello',
      version: '0.1.0',
      does: 'x',
      commands: { greet: read({ does: 'greets', run: () => ({}) }) },
      ...parts,
    });
  const at = (url: string, variable = 'HELLO_TOKEN') =>
    remote('hello', { url, auth: bearer(variable) });
  const broken: [string, Parts][] = [
    ...['my tool;id', '../x', 'Hello', '-x', '', 'a'.repeat(65)].map((name): [string, Parts] => [
      name,
      { name },
    ]),
    ...['../../up', 'a b', 'json', 'dry-run', 'fields', 'page', 'version', 'help'].map(
      (name): [string, Parts] => [name, { roots: [root(name, envDir('UP_HOME'))] }],
    ),
    ['cwd json', { roots: [root('json', cwd)] }],
    ['MY VAR', { roots: [root('home', envDir('MY VAR'))] }],
    ['a/b', { stored: [stored('a/b', 1, z.object({ n: z.number() }))] }],
    ['A;B', { remotes: [at('https://hello.example.com', 'A;B')] }],
    ['X-Y', { remotes: [remote('hello', { url: envUrl('X-Y', 'https://hello.example.com') })] }],
  ];
  for (const [name, parts] of broken) {
    const { exit, issues } = await answerOf(made(parts), 'greet');
    assert.deepEqual([exit, issues?.map(i => i.code)], [2, ['DECLARATION']], name);
  }
  const fine: Parts[] = [
    { name: '9-lives' },
    { roots: [root('home', envDir('HELLO_HOME')), root('work-2', cwd)] },
    { stored: [stored('friend', 1, z.object({ n: z.number() }))] },
    { remotes: [at(envUrl('HELLO_URL', 'https://hello.example.com'), 'hello_token')] },
  ];
  for (const parts of fine) assert.equal((await answerOf(made(parts), 'greet')).exit, 0);
});

test('a command listed in two places is a DECLARATION error', async () => {
  const once = read({ does: 'x', run: () => ({}) });
  const twice = tool({
    name: 'twice',
    version: '0.1.0',
    does: 'x',
    commands: { a: once, b: once },
  });
  const { exit, issues } = await answerOf(twice, 'a');
  assert.equal(exit, 2);
  assert.deepEqual(
    issues?.map(i => i.code),
    ['DECLARATION'],
  );
});

test('a field named like an option adx gives the command is a DECLARATION error', async () => {
  const Item = z.object({ code: z.string() });
  const fields = (input: z.ZodObject) =>
    tool({
      name: 'clash',
      version: '0.1.0',
      does: 'x',
      commands: {
        // a JavaScript caller passes what the type checker refuses
        each: list({
          does: 'x',
          input,
          item: Item,
          key: 'code',
          outline: [],
          run: () => ({ items: [] }),
        }),
        change: effect({ does: 'x', input, plan: () => ({}) }),
      },
    });
  const clashes = await answerOf(
    fields(z.object({ page: z.string(), dryRun: z.boolean() })),
    'each',
  );
  assert.equal(clashes.exit, 2);
  // page clashes only on the list, dry-run on both
  assert.equal(clashes.issues?.length, 3);
  const free = await answerOf(
    fields(z.object({ version: z.string() })),
    'change',
    '--version',
    '3',
  );
  assert.deepEqual([free.exit, free.result], [0, {}]);
});

test('two fields that make one option are a DECLARATION error', async () => {
  const both = tool({
    name: 'both',
    version: '0.1.0',
    does: 'x',
    commands: {
      due: read({
        does: 'x',
        input: z.object({ dueDate: z.string(), 'due-date': z.string() }),
        run: () => ({}),
      }),
    },
  });
  const { exit, issues } = await answerOf(both, 'due', '--due-date', 'x');
  assert.deepEqual([exit, issues?.map(i => i.code)], [2, ['DECLARATION']]);
});

test('an option with no command after it names the call that lists the commands', async () => {
  for (const [argv, place] of [
    [['--help'], 'hello'],
    [['friends', '--help'], 'hello friends'],
  ] as const) {
    const { exit, issues } = await answerOf(hello, ...argv);
    assert.deepEqual(
      [exit, issues?.map(i => [i.code, i.message, i.command])],
      [1, [['OPTION_BEFORE_COMMAND', `--help needs a command, and ${place} names none`, place]]],
    );
  }
});

test('an example that fails the schema of its command is a DECLARATION error, one per place', async () => {
  const input = z.object({ key: z.string().regex(/^[A-Z]+-\d+$/), count: z.number().int() });
  const show = read({ does: 'x', input, example: { key: 'cw-112', count: 1.5 }, run: () => ({}) });
  const fine = read({ does: 'x', input, example: { key: 'CW-112', count: 2 }, run: () => ({}) });
  const shows = (command: typeof show) =>
    tool({ name: 'tracker', version: '0.1.0', does: 'x', commands: { show: command } });
  const failed = await answerOf(shows(show), 'show', '--key', 'CW-112', '--count', '2');
  assert.deepEqual(
    [failed.exit, failed.kind, failed.issues?.map(i => i.code)],
    [2, 'bug', ['DECLARATION', 'DECLARATION']],
  );
  // the message up to the reason of Zod, which is Zod's wording
  assert.deepEqual(
    failed.issues?.map(i => i.message.slice(0, i.message.indexOf(': '))),
    [
      'tracker show has the example {"key":"cw-112","count":1.5}, which fails its input at key',
      'tracker show has the example {"key":"cw-112","count":1.5}, which fails its input at count',
    ],
  );
  const passed = await answerOf(shows(fine), 'show', '--key', 'CW-112', '--count', '2');
  assert.deepEqual([passed.exit, passed.result], [0, {}]);
});

test('an example on which the input throws is one DECLARATION error that names it', async () => {
  // JSON.parse throws on a text that is no JSON, inside the schema
  const input = z.object({ n: z.string().transform(text => JSON.parse(text)) });
  const show = read({ does: 'x', input, example: { n: 'boom' }, run: () => ({}) });
  const broken = tool({ name: 'tracker', version: '0.1.0', does: 'x', commands: { show } });
  const { exit, issues } = await answerOf(broken, 'show', '--n', '1');
  assert.deepEqual(
    [exit, issues?.map(i => [i.code, i.message.slice(0, i.message.indexOf(': '))])],
    [2, [['DECLARATION', 'tracker show has the example {"n":"boom"}, and its input threw on it']]],
  );
});

test('a global example that fails the global input is a DECLARATION error of each command that takes it', async () => {
  const project = global({
    input: z.object({ project: z.string().regex(/^[a-z]+-[a-z]+$/) }),
    example: { project: 'web' },
  });
  const labels = project.read({ does: 'x', run: () => ({}) });
  const whoami = project.read({ does: 'x', global: false, run: () => ({}) });
  const tracker = tool({
    name: 'tracker',
    version: '0.1.0',
    does: 'x',
    global: project,
    commands: { labels, whoami },
  });
  const { exit, issues } = await answerOf(tracker, 'whoami');
  assert.deepEqual([exit, issues?.map(i => i.code)], [2, ['DECLARATION']]);
});
