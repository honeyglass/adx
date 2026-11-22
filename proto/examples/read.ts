// Guide, "A command that reads": greet learns a language from a fixed list.
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';

const hellos = { en: 'Hello', de: 'Hallo', eo: 'Saluton' };

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
  }),
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${hellos[lang]}, ${name}!` }),
  text: out => out.greeting,
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { greet },
});

export { greet };
if (import.meta.main) await hello.main();
