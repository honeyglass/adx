// What must NOT compile in oriko.
import { z } from 'zod';
import { after, effect, hint, list, paged, read } from '@honeyglass/adx';
import { build } from '../cli/build.ts';
import { Id, Profile } from '../core/cv.schema.ts';
import { work } from '../core/home.ts';
import { unknownBlock } from '../core/issues.ts';
import { cv, profile } from '../core/options.ts';
import { init } from '../cv/init.ts';
import { show } from '../cv/show.ts';
import * as block from '../edit/block.ts';
import { INPUT } from '../edit/edit.schema.ts';

// A path starts with a field of the call. plan has `cv` and `profile` and no `blocks`: the
// unknown block of a stored profile stands below `profile`, not at `blocks.nobody` as today.
read({
  does: 'x',
  input: z.object({ cv, profile }),
  run: (_, { refuse }) => refuse(unknownBlock.at(['profile', 'blocks', 'nobody'])),
});
read({
  does: 'x',
  input: z.object({ cv, profile }),
  // @ts-expect-error blocks is no field of plan
  run: (_, { refuse }) => refuse(unknownBlock.at(['blocks', 'nobody'])),
});
// profile set takes the profile's parts as fields, so there the path is `blocks.nobody`.
effect({
  does: 'x',
  input: z.object({ profile: Id, ...Profile.shape }),
  replace: false,
  plan: (_, { refuse }) => refuse(unknownBlock.at(['blocks', 'nobody'])),
});

// `page` is free on an effect, as block move needs it, and taken on a list.
effect({ does: 'x', input: INPUT['block move'], replace: false, plan: ({ page }) => ({ page }) });
list({
  does: 'x',
  // @ts-expect-error a list has --page from adx
  input: INPUT['block move'],
  item: z.object({ id: Id }),
  key: 'id',
  outline: [],
  run: (_, { page }) => paged([], page),
});

// build says replace: 'always' once, at the command. A write has no option for it.
effect({
  does: 'x',
  input: z.object({ cv }),
  replace: 'always',
  // @ts-expect-error files.write takes no replaces option
  plan: (_, { files }) => files.write(work.file('cv.docx'), 'x', { replaces: 'always' }),
});

// A step carries a field of the refused call, and only a field of its own command.
hint(unknownBlock, () => show.step().carry('cv', 'profile'));
// @ts-expect-error show has no field cvs
hint(unknownBlock, () => show.step().carry('cvs'));

// A step lists the values of a field, and only of a field with a source in `values`.
hint(unknownBlock, () => show.step().carry('cv').lists('block'));
// @ts-expect-error show has no field blocks
hint(unknownBlock, () => show.step().lists('blocks'));
// @ts-expect-error block move has a field id, and no source for it
hint(unknownBlock, () => block.move.step().lists('id'));
// @ts-expect-error a step that gives block a value cannot also list it
hint(unknownBlock, () => show.step({ block: 'awards' }).lists('block'));
// @ts-expect-error a field the step still needs is not one it lists
hint(unknownBlock, () => show.step().needs('block').lists('block'));
// @ts-expect-error a field the step lists is not one it still needs
hint(unknownBlock, () => show.step().lists('block').needs('block'));

// One after for a list of commands: the function must fit every command of the list.
after([block.add, block.move], (out, { cv }) => (out.fits ? [build.step({ cv })] : []));
// @ts-expect-error init answers no fits, so the function does not fit every command
after([block.add, init], out => (out.fits ? [build.step()] : []));
// @ts-expect-error block move has no field block, so the function does not fit every command
after([block.add, block.move], (_, { block }) => [show.step({ block: block.id })]);
// @ts-expect-error a list names one command at least
after([], () => []);
