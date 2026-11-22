// One release, as every command of releases/ reads it.
import { z } from 'zod';
import { id, multiline } from '@honeyglass/adx';

export const Release = z.object({
  id: id().describe('the release key, such as r214'),
  state: z.enum(['built', 'live', 'retired']).describe('built, live or retired'),
  commit: z.string().describe('the commit it was built from'),
  author: z.string().describe('who built it'),
  notes: multiline().describe('the release notes, Markdown'),
});
