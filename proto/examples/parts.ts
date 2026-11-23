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

// ---- what must NOT compile ----
read({
  does: 'x',
  input: z.object({ people: z.array(Person) }),
  example: { people: [] },
  // @ts-expect-error a path starts with a field of the input, and persons is none
  check: ({ people }) => (people.length > 9 ? [twice.at(['persons', 9, 'name'])] : []),
  run: ({ people }) => ({ people }),
});
read({
  does: 'x',
  input: z.object({ people: z.array(Person) }),
  example: { people: [] },
  run: ({ people }, { refuse }) => {
    // @ts-expect-error the same in a refusal, reported on this line
    if (people.length > 9) return refuse(twice.at(['persons', 9]));
    return { people };
  },
});
// @ts-expect-error a path names its field at least
twice.at([]);
tool({
  name: 'bad',
  version: '0.1.0',
  does: 'x',
  // @ts-expect-error a shape is a schema, not a sample of the data
  shapes: { person: { name: 'Ada' } },
  commands: {},
});

if (import.meta.main) await hello.main();
