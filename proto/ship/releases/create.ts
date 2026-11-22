import { z } from 'zod';
import { id } from '@honeyglass/adx';
import { effect } from '../core/app.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { api } from '../core/server.ts';
import { releases } from './list.ts';
import { draftChoices, draftFile } from './notes/drafts.ts';
import { promote } from './promote.ts';
import { Release } from './release.schema.ts';
import { show } from './show.ts';

export const create = effect({
  does: 'builds a release from a commit',
  input: z.object({
    commit: z.string().describe('the commit to build, such as 4f2a91c'),
    notes: id().optional().describe('a notes draft to attach'),
  }),
  example: { commit: '4f2a91c' },
  values: { notes: draftChoices },
  replace: false,
  plan: async ({ app, commit, notes }) => {
    const draft = notes === undefined ? undefined : draftFile(app, notes);
    return { app, commit, notes: (await draft?.text(FILE_LIMITS.noteBytes)) ?? '' };
  },
  apply: async ({ app }, { act, planned }) => {
    const data = { commit: planned.commit, notes: planned.notes };
    const request = api.post(['apps', app, 'releases'], data);
    return { release: await act.send('the new release', request, Release) };
  },
  look: () => releases.step(),
  next: ({ release }) => [
    show.step({ release: release.id }),
    promote.step({ release: release.id }),
  ],
});
