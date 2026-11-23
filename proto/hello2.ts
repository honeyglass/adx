// Guide, chapter "Basics": the whole hello. What must not compile stands in hello2.types.ts.
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

export { add, language };
// for hello2.types.ts
export { blankName, friendFile, greet, Language, LANGUAGES, languageChoices, languages };
export { noFormal, noFriends };
if (import.meta.main) await hello.main();
