// Guide, "A command that reads": greet learns a language from a fixed list.
import { z } from 'zod';
import { tool } from '@honeyglass/adx';

const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets people' });

const hellos = { en: 'Hello', de: 'Hallo', eo: 'Saluton' };

const GreetIn = z.object({
  name: z.string().describe('who to greet'),
  lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
});

const greet = hello.read({
  name: 'greet',
  does: 'greets one person',
  input: GreetIn,
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${hellos[lang]}, ${name}!` }),
  text: out => out.greeting,
});

export { greet };
if (import.meta.main) await hello.main();
