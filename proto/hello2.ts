// Guide, chapter "Basics": the whole hello, and below it the cases that must not compile.
import { z } from 'zod';
import {
  code,
  detailOf,
  effect,
  envDir,
  fresh,
  id,
  list,
  paged,
  read,
  root,
  tool,
} from '@honeyglass/adx';
import { RefusalError } from '@honeyglass/utils/ts';

const home = root('home', envDir('HELLO_HOME'));

const LANGUAGES = [
  { code: 'ar', name: 'Arabic', hello: 'Marhaba', formal: 'As-salamu alaykum' },
  { code: 'de', name: 'German', hello: 'Hallo', formal: 'Guten Tag' },
  { code: 'en', name: 'English', hello: 'Hello', formal: 'Good day' },
  { code: 'eo', name: 'Esperanto', hello: 'Saluton' },
  // ...and 38 more
];
const byCode = (code: string) => LANGUAGES.find(l => l.code === code);

const languageChoices = () => LANGUAGES.map(l => ({ value: l.code, does: l.name }));

const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);

const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');
const unknownLanguage = code('UNKNOWN_LANGUAGE', 'fix', 'Use a code the list answers');

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.string().default('en').describe('the language code'),
    style: z.enum(['casual', 'formal']).default('casual').describe('how to greet'),
  }),
  example: { name: 'Ada' },
  values: { lang: languageChoices },
  check: ({ name }) => (name.trim() === '' ? [blankName.at('name')] : []),
  run: ({ name, lang, style }, { refuse }) => {
    const l = byCode(lang);
    if (l === undefined)
      throw new RefusalError({
        kind: 'bug',
        step: 'greet',
        reason: `no language ${lang}, though adx checked it against its list`,
        next: 'report the bug to the maintainer of hello',
        state: 'Nothing was greeted.',
      });
    if (style === 'formal' && l.formal === undefined)
      return refuse(
        noFormal
          .at('style', `${l.name} has no formal greeting`)
          .command(language.step({ code: l.code })),
      );
    const word = style === 'formal' ? l.formal : l.hello;
    return { greeting: `${word}, ${name}!` };
  },
  text: out => out.greeting,
});

const Language = z.object({
  code: id().describe('the language code, such as de'),
  name: z.string().describe('the language in English'),
  hello: z.string().describe('the casual greeting'),
  formal: z.string().optional().describe('the formal greeting'),
});

const languages = list({
  does: 'lists the languages hello speaks',
  item: Language,
  key: 'code',
  outline: ['name'],
  pageSize: 10,
  run: (_, { page }) => paged(LANGUAGES, page),
});

const language = read({
  does: 'shows one language in full',
  input: z.object({ code: id().describe('the language code') }),
  example: { code: 'de' },
  values: { code: detailOf(languages) },
  run: ({ code }, { refuse }) => byCode(code) ?? refuse(unknownLanguage.at('code')),
});

const add = effect({
  does: 'remembers a friend',
  input: z.object({
    name: id().describe("the friend's short name"),
    lang: z.string().describe("the friend's language code"),
  }),
  example: { name: 'ada', lang: 'de' },
  values: { name: fresh(friendNames), lang: languageChoices },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
  next: (_, friend) => [greet.step({ lang: friend.lang })],
});

// A command without input can refuse: an issue that concerns no field.
const noFriends = code('NO_FRIENDS', 'fix', 'Add a friend first');
const count = read({
  does: 'counts the friends',
  run: async (_, { refuse }) => {
    const names = await friendNames();
    return names.length === 0
      ? refuse(noFriends.issue().command(add.step()))
      : { friends: names.length };
  },
});

// The tool: every command stands in the table, under the word that calls it.
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  skill: 'SKILL.md',
  roots: [home],
  commands: {
    greet,
    languages,
    language,
    friends: { add, count },
  },
  start: async () => {
    const friends = await friendNames();
    return friends.length === 0 ? [add.step()] : [greet.step()];
  },
});

// An optional field the step still needs.
greet.step({ lang: 'de' }).needs('style');

// ---- what must NOT compile ----
read({
  does: 'x',
  input: z.object({ name: z.string(), lang: z.string() }),
  example: { name: 'Ada', lang: 'de' },
  // @ts-expect-error typo in a values key
  values: { lnag: languageChoices },
  run: ({ name }) => ({ greeting: name }),
});
read({
  does: 'x',
  input: z.object({ name: z.string(), style: z.string() }),
  example: { name: 'Ada', style: 'x' },
  run: ({ name }, { refuse }) => {
    // @ts-expect-error refusal at a field that does not exist, reported on this line
    if (name === '') return refuse(noFormal.at('styl'));
    return { greeting: name };
  },
});
list({
  does: 'x',
  item: Language,
  // @ts-expect-error key is no field of the item
  key: 'kode',
  outline: ['name'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
list({
  does: 'x',
  item: Language,
  key: 'code',
  // @ts-expect-error outline typo
  outline: ['nmae'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
read({
  does: 'x',
  input: z.object({ code: id() }),
  example: { code: 'de' },
  // @ts-expect-error detailOf at a field the input does not have
  values: { kode: detailOf(languages) },
  run: ({ code }) => ({ code }),
});
effect({
  does: 'x',
  input: z.object({ name: id(), lang: z.string() }),
  example: { name: 'ada', lang: 'de' },
  plan: friend => friend,
  // @ts-expect-error needs names a field greet does not have
  next: friend => [greet.step({ lang: friend.lang }).needs('nmae')],
});
read({
  does: 'x',
  input: z.object({ name: z.string() }),
  example: { name: 'Ada' },
  // @ts-expect-error a check issue at a field that does not exist
  check: ({ name }) => (name === '' ? [blankName.at('nmae')] : []),
  run: ({ name }) => ({ greeting: name }),
});
read({
  does: 'x',
  input: z.object({ name: z.string() }),
  // @ts-expect-error example misses the required name
  example: {},
  run: ({ name }) => ({ greeting: name }),
});
// @ts-expect-error invoke with a misspelled field
void greet.invoke({ nmae: 'Ada' });

// the old names and shapes are gone
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.put was renamed files.write
  plan: ({ name }, { files }) => files.put(friendFile(name), name),
});
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error replace takes false or 'always'; without it the command takes --replace
  replace: true,
  plan: ({ name }) => ({ name }),
});
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.update takes the limit and a function, not the new content
  plan: ({ name }, { files }) => files.update(friendFile(name), name),
});
tool({
  name: 'bad12',
  version: '0.1.0',
  does: 'x',
  // @ts-expect-error the skill is a path, not a URL
  skill: new URL('./SKILL.md', import.meta.url),
  commands: {},
});
// @ts-expect-error the option of a root cannot be switched off
root('bad13', envDir('HELLO_HOME'), { option: false });
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.update takes no mode: a changed file keeps its mode
  plan: ({ name }, { files }) => files.update(friendFile(name), 100, () => name, { mode: 0o644 }),
});
read({
  does: 'x',
  // @ts-expect-error a command without input has no field to refuse at; use .issue()
  run: (_, { refuse }) => refuse(noFriends.at('friends')),
});
// @ts-expect-error .at() always names a field
noFriends.at();

// A field named like an option adx gives the command does not compile.
list({
  does: 'x',
  // @ts-expect-error a list has --page from adx
  input: z.object({ page: z.number() }),
  example: { page: 2 },
  item: Language,
  key: 'code',
  outline: ['name'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
read({
  does: 'x',
  // @ts-expect-error a read with output has --fields from adx
  input: z.object({ fields: z.string() }),
  example: { fields: 'name' },
  output: Language,
  run: () => ({ code: 'de', name: 'German', hello: 'Hallo' }),
});
read({
  does: 'x',
  // @ts-expect-error every command has --help from adx
  input: z.object({ help: z.string() }),
  example: { help: 'x' },
  run: ({ help }) => ({ help }),
});
// An effect has no --page, and no command has --version: both names are free there.
effect({
  does: 'x',
  input: z.object({ name: id(), page: z.number(), version: z.string() }),
  example: { name: 'ada', page: 2, version: '3' },
  replace: false,
  plan: ({ name, page, version }) => ({ name, page, version }),
});
// A read without output has no --fields.
read({
  does: 'x',
  input: z.object({ fields: z.string() }),
  example: { fields: 'name' },
  run: ({ fields }) => ({ fields }),
});

// @ts-expect-error oneOf was renamed detailOf
import { oneOf } from '@honeyglass/adx';
// @ts-expect-error listedBy was renamed keyOf
import { listedBy } from '@honeyglass/adx';

export { add, language };
if (import.meta.main) await hello.main();
