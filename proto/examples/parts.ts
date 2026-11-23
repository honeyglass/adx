// Guide, "Input that has parts": an issue at a part of a field, and a shape the tool lists.
import { z } from 'zod';
import { code, read, tool } from '@honeyglass/adx';

const hellos = { en: 'Hello', de: 'Hallo', eo: 'Saluton' };

// One person to greet, as a caller writes it. No command takes it whole, so the tool lists it.
const Person = z.object({
  name: z.string().describe('who to greet'),
  lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
});

const twice = code('NAME_TWICE', 'fix', 'Name each person once');

const greetAll = read({
  does: 'greets several people',
  input: z.object({ people: z.array(Person).describe('the people to greet') }),
  example: { people: [{ name: 'Ada', lang: 'de' }] },
  check: ({ people }) =>
    people.flatMap((person, i) =>
      people.findIndex(p => p.name === person.name) < i
        ? [twice.at(['people', i, 'name'], `${person.name} is named twice`)]
        : [],
    ),
  run: ({ people }) => ({
    greetings: people.map(person => `${hellos[person.lang]}, ${person.name}!`),
  }),
});

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  shapes: { person: Person },
  commands: { 'greet-all': greetAll },
});

// The flat form stays: an issue at the field itself.
twice.at('people');

export { Person, twice }; // for parts.types.ts
if (import.meta.main) await hello.main();
