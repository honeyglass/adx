import { z } from 'zod';
import { id, multiline } from '@honeyglass/adx';
import { read } from '../../core/app.ts';
import { FILE_LIMITS } from '../../core/files.limits.ts';
import { draftChoices, draftFile } from './drafts.ts';

export const show = read({
  does: 'shows one notes draft',
  input: z.object({ name: id().describe('the name of the draft') }),
  example: { name: 'spring' },
  values: { name: draftChoices },
  output: z.object({
    name: z.string().describe('the name of the draft'),
    text: multiline().describe('the notes, Markdown'),
  }),
  run: async ({ app, name }) => ({
    name,
    text: await draftFile(app, name).text(FILE_LIMITS.noteBytes),
  }),
});
