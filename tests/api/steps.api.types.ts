/**
 * What must and must not compile with the built steps, after, hint, tell and schema.
 *
 * The typecheck reads this file, and nothing runs it. proto/oriko/tests/types.ts and
 * proto/tracker/tests/types.ts hold the same cases, but they import values a later part of adx
 * builds, so they cannot yet compile against dist/.
 *
 * @example pnpm run typecheck
 */
import { z } from 'zod';
import { after, code, effect, global, hint, read, schema, tell } from '@honeyglass/adx';
import type { Step } from '@honeyglass/adx';

const unknownBlock = code('UNKNOWN_BLOCK', 'fix', 'Use a block the CV has');
const blocks = () => [{ value: 'awards' }];

const show = read({
  does: 'x',
  input: z.object({ cv: z.string(), profile: z.string().optional(), block: z.string() }),
  values: { block: blocks },
  run: ({ cv }) => ({ cv }),
});
const add = effect({
  does: 'x',
  input: z.object({ cv: z.string(), block: z.string() }),
  plan: ({ cv }) => ({ cv, fits: true }),
});
const move = effect({
  does: 'x',
  input: z.object({ cv: z.string(), id: z.string(), page: z.number() }),
  plan: ({ cv }) => ({ cv, fits: false }),
});
const init = effect({ does: 'x', input: z.object({ cv: z.string() }), plan: () => ({}) });

// A step names fields of its command, gives some, and needs an optional one only by name.
export const steps: Step[] = [
  show.step({ cv: 'jane' }),
  show.step().needs('profile'),
  tell('upload the file by hand'),
  schema.step('profile set'),
];
// @ts-expect-error cvs is no field of show
show.step({ cvs: 'jane' });
// @ts-expect-error nmae is no field of show
show.step().needs('nmae');

// A step carries a field of the refused call, and only a field of its own command.
hint(unknownBlock, () => show.step().carry('cv', 'profile'));
// @ts-expect-error show has no field cvs
hint(unknownBlock, () => show.step().carry('cvs'));

// A step lists the values of a field, and only of a field with a source in `values`.
hint(unknownBlock, () => show.step().carry('cv').lists('block'));
// @ts-expect-error show has no field blocks
hint(unknownBlock, () => show.step().lists('blocks'));
// @ts-expect-error move has a field id, and no source for it
hint(unknownBlock, () => move.step().lists('id'));
// @ts-expect-error a step that gives block a value cannot also list it
hint(unknownBlock, () => show.step({ block: 'awards' }).lists('block'));
// @ts-expect-error a field the step still needs is not one it lists
hint(unknownBlock, () => show.step().needs('block').lists('block'));
// @ts-expect-error a field the step lists is not one it still needs
hint(unknownBlock, () => show.step().lists('block').needs('block'));

// A hint names a command, so a step for the person does not compile, nor a step to schema.
// @ts-expect-error a step from tell has no command
hint(unknownBlock, () => tell('ask an admin'));
// @ts-expect-error a step to schema is no step to a command of the tool
hint(unknownBlock, () => schema.step('profile'));
// @ts-expect-error a hint takes the code, not its name
hint('UNKNOWN_BLOCK', () => show.step());
// @ts-expect-error a hint stands for a code, not for one issue of it
hint(unknownBlock.issue(), () => show.step());

// after gets the answer of the real run and the input of its command, or of every listed one.
after(add, ({ fits }, { block }) => (fits ? [show.step({ block })] : []));
// @ts-expect-error fist is no field of the answer of add
after(add, ({ fist }) => [show.step({ cv: fist })]);
after([add, move], (out, { cv }) => (out.fits ? [show.step({ cv })] : []));
// @ts-expect-error init answers no fits, so the function does not fit every command
after([add, init], out => (out.fits ? [show.step()] : []));
// @ts-expect-error move has no field block, so the function does not fit every command
after([add, move], (_, { block }) => [show.step({ block })]);
// @ts-expect-error a list names one command at least
after([], () => []);
// @ts-expect-error a list takes commands, not objects that look like one
after([{ name: 'x' }], () => []);

// A global field reaches the input of after only for a command that takes it.
const project = global({ input: z.object({ project: z.string() }), example: { project: 'web' } });
const tickets = project.read({ does: 'x', run: ({ project }) => ({ project }) });
const whoami = project.read({ does: 'x', global: false, run: () => ({ user: 'ada' }) });
after(tickets, (_, { project }) => [tickets.step({ project })]);
// @ts-expect-error whoami takes no project
after(whoami, (_, { project }) => [tickets.step({ project })]);
