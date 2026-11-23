// What must not compile in parts.ts. The typecheck reads this file, and nothing runs it.
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';
import { Person, twice } from './parts.ts';

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
