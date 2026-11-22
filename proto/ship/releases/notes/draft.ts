import { z } from 'zod';
import { fresh, id, multiline } from '@honeyglass/adx';
import { effect } from '../../core/app.ts';
import { create } from '../create.ts';
import { draftFile, draftNames } from './drafts.ts';

export const draft = effect({
  does: 'stores the notes of a coming release',
  input: z.object({
    name: id().describe('a short name for the draft, such as winter-sale'),
    text: multiline().describe('the notes, Markdown'),
  }),
  example: { name: 'winter-sale', text: '- gift cards at checkout' },
  values: { name: fresh(({ app }) => (app === undefined ? [] : draftNames(app))) },
  plan: ({ app, name, text }, { files }) => files.write(draftFile(app, name), `${text}\n`),
  next: (_, { name }) => [create.step({ notes: name })],
});
