/**
 * What must and must not compile with the built needs, fresh, keyOf, detailOf and Source.
 *
 * The typecheck reads this file, and nothing runs it. proto/needs.ts and proto/hello2.types.ts
 * hold the same cases, but they import values a later part of adx builds, so they cannot yet
 * compile against dist/.
 *
 * @example pnpm run typecheck
 */
import { z } from 'zod';
import { detailOf, effect, fresh, global, keyOf, list, needs, read } from '@honeyglass/adx';
import type { Choice, Source } from '@honeyglass/adx';

const project = global({
  input: z.object({ project: z.string() }),
  example: { project: 'web' },
  values: { project: () => [{ value: 'web' }] },
});

const choices = (names: string[]): Choice[] => names.map(value => ({ value }));

// A named source says which fields it reads, and names every field that is surely missing.
type Fields = { project: string; team: string };
export const milestones: Source<Fields> = async ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (team === undefined) return needs('team');
  return choices([`${project}/${team}`]);
};
// A typo in needs of a named source does not compile, and the error stands at the source.
export const typo: Source<Fields> = async ({ project }) =>
  // @ts-expect-error tema is no field the source reads
  project === undefined ? needs('project', 'tema') : choices([]);
// @ts-expect-error needs takes at least one field
needs();

const input = z.object({ team: z.string(), milestone: z.string() });

// A source written in `values` gets its fields from the command, the global ones too.
project.effect({
  does: 'x',
  input,
  values: { team: () => choices(['web']), milestone: milestones },
  plan: () => ({}),
});
project.effect({
  does: 'x',
  input,
  values: {
    // @ts-expect-error tema is no field of this command
    milestone: ({ project }) => (project === undefined ? needs('project', 'tema') : choices([])),
  },
  plan: () => ({}),
});
// A source that reads a field the command does not have does not compile where it is used.
const other: Source<{ region: string }> = ({ region }) =>
  region === undefined ? needs('region') : choices([]);
effect({
  does: 'x',
  input,
  // @ts-expect-error region is no field of this command
  values: { milestone: other },
  plan: () => ({}),
});

// fresh answers the names already taken, from the input of the call.
project.effect({
  does: 'x',
  input: z.object({ name: z.string() }),
  values: { name: fresh(({ project }) => (project === undefined ? [] : [`${project}-ada`])) },
  plan: () => ({}),
});
// @ts-expect-error fresh answers names, not choices
fresh(() => choices(['ada']));

// keyOf and detailOf take a list, at a field of the command.
const languages = list({
  does: 'x',
  item: z.object({ code: z.string() }),
  key: 'code',
  outline: [],
  run: () => ({ items: [] }),
});
read({
  does: 'x',
  input: z.object({ code: z.string() }),
  values: { code: detailOf(languages) },
  run: ({ code }) => ({ code }),
});
read({
  does: 'x',
  input: z.object({ code: z.string() }),
  // @ts-expect-error kode is no field of this command
  values: { kode: keyOf(languages) },
  run: ({ code }) => ({ code }),
});
const greet = read({ does: 'x', run: () => ({}) });
// @ts-expect-error a read is no list
keyOf(greet);
