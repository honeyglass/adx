/**
 * Tools for the api test of conformance: one that keeps every probed rule, and one per broken
 * rule, each broken in one place.
 *
 * hello, api, routes: the tool that keeps the rules, its remote, and the routes of its fake.
 * quoting: a tool that keeps the rules and names commands in every quoting of sh.
 * noisy, unlisted, unbounded, unwritten, broken, leaky, sending, loose, listless, commandless,
 * templated, unstarted, unprintable, unexampled, misgiven, unquoted: a tool that breaks one rule
 * each.
 * fixed: a remote with a fixed address, whose fake no program can reach.
 * skilled: a tool that names its skill, which keeps the rules when its test names a skill file.
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { RefusalError } from '@honeyglass/utils/ts';
import { z } from 'zod';
import {
  effect,
  failed,
  keyOf,
  tell,
  code,
  envDir,
  envUrl,
  fresh,
  id,
  list,
  paged,
  read,
  remote,
  root,
  tool,
} from '@honeyglass/adx';

const home = root('home', envDir('HELLO_HOME'));

export const api = remote('hello', { url: envUrl('HELLO_URL', 'https://hello.example.com') });

export const routes = { 'GET /user': { login: 'ada' } };

const names = async () => (await home.list('friends', '.json')).map(file => file.stem);

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.enum(['en', 'de']).default('en').describe('the language'),
  }),
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${lang === 'de' ? 'Hallo' : 'Hello'}, ${name}!` }),
});

const add = effect({
  does: 'remembers a friend',
  input: z.object({ name: id().describe('a short name'), lang: z.string() }),
  example: { name: 'bob', lang: 'de' },
  values: { name: fresh(names) },
  plan: ({ name, lang }, { files }) => files.write(home.file(`friends/${name}.json`), lang),
  // a quote in the value, so the kit reads the step back through the shell's quoting
  next: (_, { name }) => [greet.step({ name: `${name} O'Hara` })],
});

const friends = list({
  does: 'lists the friends',
  item: z.object({ name: z.string() }),
  key: 'name',
  outline: ['name'],
  run: async (_, { page }) =>
    paged(
      (await names()).map(name => ({ name })),
      page,
    ),
});

const whoami = read({
  does: 'names the account',
  run: () => api.get(['user'], z.object({ login: z.string() })),
});

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home],
  remotes: [api],
  commands: { greet, whoami, friends: { add, list: friends } },
});

const small = (name: string, run: () => unknown, more: object = {}) =>
  tool({
    name: 'hello',
    version: '0.1.0',
    does: 'x',
    commands: { [name]: read({ does: 'answers', run, ...more }) },
  });

export const skilled = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  skill: 'hello',
  commands: { greet: read({ does: 'answers', run: () => ({}) }) },
});

// A forgotten debug line on stdout.
export const noisy = small('chatty', () => {
  console.log('debug');
  return { done: true };
});

// A step to a command no tool has, written by hand.
export const unlisted = small('lost', () => ({}), {
  next: () => [{ does: 'goes nowhere', command: 'hello nowhere' }],
});

// A long list from a read without output.
export const unbounded = small('all', () => ({ items: Array.from({ length: 60 }, (_, i) => i) }));

// An effect that takes --replace and writes no file.
export const unwritten = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  commands: {
    touch: effect({ does: 'touches nothing', example: {}, plan: () => ({ done: true }) }),
  },
});

// A bug in a handler.
export const broken = small('crash', () => {
  throw new TypeError('boom');
});

// A plan that writes around adx, into the working directory, so a dry run changes a file.
export const leaky = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  commands: {
    save: effect({
      does: 'saves a note',
      example: {},
      replace: false,
      plan: () => {
        writeFileSync('leak.txt', 'x');
        return { saved: true };
      },
    }),
  },
});

// A plan that sends around adx, to the fake of its remote, so a dry run sends a POST.
export const sending = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  commands: {
    post: effect({
      does: 'posts a note',
      example: {},
      replace: false,
      plan: async () => {
        await fetch(`${process.env.HELLO_URL ?? ''}/notes`, { method: 'POST' });
        return { posted: true };
      },
    }),
  },
});

// An input that keeps fields it does not name.
export const loose = small('keep', () => ({}), {
  input: z.looseObject({ name: z.string() }),
  example: { name: 'Ada' },
});

const shelf = (name: string) => [{ value: `${name}-1` }];

// A field whose option alone breaks, though it lists once the other field is known.
export const listless = small('pick', () => ({}), {
  input: z.object({ shelf: z.string(), book: z.string() }),
  example: { shelf: 'a', book: 'a-1' },
  values: {
    book: ({ shelf: name }: { shelf?: string }) => {
      if (name !== undefined) return shelf(name);
      const cause = new RefusalError({
        kind: 'ask',
        step: 'books',
        reason: 'no shelf',
        next: 'ask',
      });
      throw failed('Nothing was listed.', cause);
    },
  },
});

const languages = list({
  does: 'lists the languages',
  item: z.object({ code: z.string() }),
  key: 'code',
  outline: ['code'],
  run: (_, { page }) => paged([{ code: 'en' }], page),
});
const unknownLanguage = code('UNKNOWN_LANGUAGE', 'fix', 'Use a language the list answers');

// A refusal at a field with a list that names no command for it.
export const commandless = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  commands: {
    languages,
    greet: read({
      does: 'greets in a language',
      input: z.object({ lang: z.string() }),
      example: { lang: 'en' },
      values: { lang: keyOf(languages) },
      run: ({ lang }, { refuse }) =>
        lang === 'en'
          ? { greeting: 'Hello' }
          : refuse(unknownLanguage.at('lang').command(tell('ask a person for the language'))),
    }),
  },
});

// A text field adx does not keep to one line.
export const templated = small('echo', () => ({}), {
  input: z.object({ word: z.templateLiteral([z.string()]) }),
  example: { word: 'hi' },
});

// A start answer that is refused.
export const unstarted = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  commands: { greet: read({ does: 'greets', run: () => ({}) }) },
  start: () => {
    const cause = new RefusalError({ kind: 'ask', step: 'start', reason: 'down', next: 'ask' });
    throw failed('Nothing was started.', cause);
  },
});

// A shape whose schema cannot be written as JSON: its metadata holds a bigint.
export const unprintable = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'x',
  shapes: { amount: z.object({ cents: z.number() }).meta({ example: { cents: 1n } }) },
  commands: { greet: read({ does: 'greets', run: () => ({}) }) },
});

// A command with a required field and no example.
export const unexampled = small('greet', () => ({}), { input: z.object({ name: z.string() }) });

// A step that still needs a field, and gives another one a value it does not take.
export const misgiven = (() => {
  const pick = read({
    does: 'picks a name',
    input: z.object({ name: z.string().regex(/^a/), other: z.string() }),
    example: { name: 'a', other: 'o' },
    run: () => ({}),
  });
  const point = read({ does: 'points', run: () => ({}), next: () => [pick.step({ name: 'x' })] });
  return tool({ name: 'hello', version: '0.1.0', does: 'x', commands: { pick, point } });
})();

/** The values of exact, which the named commands below write in other quotings, or bare. */
const exactly = (steps: string[]) =>
  tool({
    name: 'hello',
    version: '0.1.0',
    does: 'x',
    commands: {
      exact: read({
        does: 'takes one of three values',
        input: z.object({ value: z.enum(['C:\\path\\x', 'a#b~c', 'a|b']) }),
        example: { value: 'a#b~c' },
        run: () => ({}),
      }),
      say: read({
        does: 'names commands',
        run: () => ({}),
        next: () => steps.map(command => ({ does: 'takes the value', command })),
      }),
    },
  });

export const quoting = exactly([
  'hello exact --value "C:\\path\\x"',
  'hello exact --value C:\\\\path\\\\x',
  "hello exact --value 'C:\\path\\x'",
  "hello ex\\\nact --value 'a#b~c'",
  'hello exact --value a#b~c',
]);

// A value exact takes, left unquoted, so the shell reads its | as a pipe: no plain call.
export const unquoted = exactly(['hello exact --value a|b']);

export const fixed = remote('fixed', { url: 'https://fixed.example.com' });
