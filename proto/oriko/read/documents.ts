// The command read, as far as adx carries it: its input, its checks, where its files go, and
// its answer. How a source becomes text stays oriko's own code, see ./sources.ts.
import { z } from 'zod';
import { effect, fresh } from '@honeyglass/adx';
import type { File, Files, Written } from '@honeyglass/adx';
import { Id } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { notesFile, postingFile, profileNames } from '../core/home.ts';
import { chosenCv } from '../core/load.ts';
import { cv } from '../core/options.ts';
import { cvChoices } from '../core/sources.ts';
import * as issue from './issues.ts';
import { documentsOf, notesText, postingText } from './sources.ts';
import type { Document } from './sources.ts';

// A stored posting that says the same is left alone. Another one is replaced only with --replace.
async function storedPosting(files: Files, file: File, posting: Document) {
  const content = postingText(posting);
  const isSame = file.exists && (await file.text(FILE_LIMITS.readBytes)) === content;
  return isSame ? undefined : files.write(file, content);
}

// Notes append: update for a CV that has notes, write for the first ones.
async function storedNotes(files: Files, file: File, notes: Document[]): Promise<Written> {
  return file.exists
    ? files.update(file, FILE_LIMITS.readBytes, old => notesText(old, notes))
    : files.write(file, notesText('', notes));
}

export const read = effect({
  does: 'reads a posting, notes or an old CV from a file or an https address',
  input: z.object({
    posting: z
      .string()
      .optional()
      .describe('the job posting: a PDF, Word, HTML or text file, or an https:// address'),
    notes: z
      .array(z.string())
      .default([])
      .describe('notes on the career, kept beside the CV; may repeat'),
    resume: z.string().optional().describe('an old CV: its text is answered and stored nowhere'),
    profile: Id.optional().describe('the profile the posting belongs to; may be a new name'),
    cv,
  }),
  example: { posting: 'posting.txt', profile: 'globex' },
  values: { profile: fresh(profileNames), cv: cvChoices },
  check: ({ posting, notes, resume, profile }) => [
    ...(posting === undefined && notes.length === 0 && resume === undefined
      ? [issue.nothingToRead.at('posting')]
      : []),
    ...(posting !== undefined && profile === undefined ? [issue.profileNeeded.at('profile')] : []),
  ],
  plan: async ({ posting, notes, resume, profile, cv }, { files, refuse }) => {
    const sources = await documentsOf({ posting, notes, resume });
    if (Array.isArray(sources)) return refuse(...sources);
    const read = sources.documents;
    // A posting belongs to a profile, notes to a CV; an old CV belongs nowhere.
    const owner = notes.length === 0 ? undefined : await chosenCv(cv);
    if (Array.isArray(owner)) return refuse(...owner);
    const job = read.find(document => document.role === 'posting');
    const noted = read.filter(document => document.role === 'notes');
    return {
      read: read.map(({ text, ...document }) => ({ ...document, chars: text.length, text })),
      profile,
      cv: owner?.name,
      posting:
        job === undefined || profile === undefined
          ? undefined
          : await storedPosting(files, postingFile(profile), job),
      notes:
        owner === undefined ? undefined : await storedNotes(files, notesFile(owner.name), noted),
    };
  },
});
