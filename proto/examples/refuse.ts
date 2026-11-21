// Guide, "Options and their values" and "Refusing bad input with a hint": greet before it has steps.
import { z } from 'zod';
import { code, tool } from '@honeyglass/adx';

const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets people' });

const LANGUAGES = [
  { code: 'ar', name: 'Arabic', hello: 'Marhaba', formal: 'As-salamu alaykum' },
  { code: 'de', name: 'German', hello: 'Hallo', formal: 'Guten Tag' },
  { code: 'en', name: 'English', hello: 'Hello', formal: 'Good day' },
  { code: 'eo', name: 'Esperanto', hello: 'Saluton' },
  // ...and 38 more
];
const byCode = (code: string) => LANGUAGES.find(l => l.code === code);

const languageChoices = () => LANGUAGES.map(l => ({ value: l.code, does: l.name }));

const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');

const GreetIn = z.object({
  name: z.string().describe('who to greet'),
  lang: z.string().default('en').describe('the language code'),
  style: z.enum(['casual', 'formal']).default('casual').describe('how to greet'),
});

const greet = hello.read({
  name: 'greet',
  does: 'greets one person',
  input: GreetIn,
  example: { name: 'Ada' },
  values: { lang: languageChoices },
  check: ({ name }) => (name.trim() === '' ? [blankName.at('name')] : []),
  run: ({ name, lang, style }, { refuse }) => {
    const l = byCode(lang);
    if (l === undefined) throw new Error(`no language ${lang}`);
    if (style === 'formal' && l.formal === undefined)
      return refuse(noFormal.at('style', `${l.name} has no formal greeting`));
    const word = style === 'formal' ? l.formal : l.hello;
    return { greeting: `${word}, ${name}!` };
  },
  text: out => out.greeting,
});

export { greet };
if (import.meta.main) await hello.main();
