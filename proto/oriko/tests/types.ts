// What must NOT compile in oriko.
import { z } from 'zod';
import { effect, list, paged, read } from '@honeyglass/adx';
import { Id, Profile } from '../core/cv.schema.ts';
import { work } from '../core/home.ts';
import { unknownBlock } from '../core/issues.ts';
import { cv, profile } from '../core/options.ts';
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
