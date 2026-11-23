// What must not compile in check.ts. The typecheck reads this file, and nothing runs it.
import { z } from 'zod';
import { check, effect, schema } from '@honeyglass/adx';
import { Colleague } from './check.ts';

// ---- what must NOT compile ----
effect({
  does: 'x',
  input: z.object({ about: z.unknown() }),
  replace: false,
  plan: ({ about }, { refuse }) => {
    const said = check(Colleague, about, ['abuot']);
    // @ts-expect-error a path starts with a field of the input, and abuot is none
    if (said.issues !== null) return refuse(...said.issues);
    return said.data;
  },
});
effect({
  does: 'x',
  input: z.object({ about: z.unknown() }),
  replace: false,
  // @ts-expect-error the value is there only when no issue is
  plan: ({ about }) => ({ team: check(Colleague, about, ['about']).data.team }),
});
// @ts-expect-error a path names its field at least
check(Colleague, {}, []);
// @ts-expect-error as takes the shape itself, not its name
check(Colleague, {}, ['about'], { as: 'colleague' });
// @ts-expect-error a step to schema names the shape or the command to show
schema.step();
