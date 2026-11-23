import { z } from 'zod';
import { multiline, read } from '@honeyglass/adx';
import { Id, Profile } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home, postingFile, profileFile } from '../core/home.ts';
import * as issue from './issues.ts';
import { set } from './set.ts';

// A name counts when it has a profile or a posting: read stores the posting first.
const shownChoices = async () => {
  const stored = await home.list('profiles', '.json');
  const postings = await home.list('profiles', '.posting.md');
  return [...new Set([...stored, ...postings].map(file => file.stem))].map(value => ({ value }));
};

export const show = read({
  does: 'shows a stored profile and the posting read for it',
  input: z.object({ profile: Id.describe('the name of the profile') }),
  example: { profile: 'acme' },
  values: { profile: shownChoices },
  output: z.object({
    name: Id.describe('the name of the profile'),
    profile: Profile.nullable().describe('the stored profile, or null'),
    posting: multiline().nullable().describe('the posting read for it, Markdown, or null'),
  }),
  run: async ({ profile: name }, { refuse }) => {
    const stored = profileFile(name);
    const posting = postingFile(name);
    if (stored.exists === false && posting.exists === false)
      return refuse(issue.nothingStored.at('profile', `No profile or posting is called ${name}`));
    return {
      name,
      profile: stored.exists ? await stored.json(FILE_LIMITS.inputBytes, Profile) : null,
      posting: posting.exists ? await posting.text(FILE_LIMITS.readBytes) : null,
    };
  },
  // A posting without a profile leads to storing one. The step to plan, which lies in cli/,
  // stands in cli/next.ts.
  next: out => (out.profile === null ? [set.step({ profile: out.name })] : []),
});
