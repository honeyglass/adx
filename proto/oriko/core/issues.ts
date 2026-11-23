// The refusals core raises, and those several features raise.
//
// A code of adx has one hint. Where oriko's hint names the field or the column today, that part
// moves into the message of the issue.
import { code } from '@honeyglass/adx';
import type { Issue } from '@honeyglass/adx';

/** What a helper answers in place of its value: at least one issue, each at a field of the call. */
export type Issues<F extends string> = [Issue<F>, ...Issue<F>[]];

// What the data folder does not hold. NO_CV concerns no field of a call, so it is raised with
// .issue(); the command that helps, init, lies in cv/ and stands in cli/hints.ts.
export const noCv = code('NO_CV', 'fix', 'Check --home, or create a CV with the command');
export const cvRequired = code('CV_REQUIRED', 'fix', 'Pass --cv with one of the CV names');
export const unknownCv = code('UNKNOWN_CV', 'fix', 'Use one of the CV names the command lists');
export const cvMismatch = code(
  'CV_MISMATCH',
  'fix',
  'Leave out --cv, or change the field cv of the profile',
);
export const unknownProfile = code(
  'UNKNOWN_PROFILE',
  'fix',
  'Use one of the profile names, or store a profile with oriko profile set',
);

// What the check of a CV finds. The command that lists the block ids, show, lies in cv/ and
// stands in cli/hints.ts.
export const unknownBlock = code('UNKNOWN_BLOCK', 'fix', 'Use one of the block ids of the CV');
export const duplicateId = code('DUPLICATE_ID', 'fix', 'Give every block its own id');
export const untitledNotAlone = code(
  'UNTITLED_NOT_ALONE',
  'fix',
  'Give the block a title, or make it the only block of its section',
);

// A fact of the master that a profile changes.
export const itemsNotInMaster = code(
  'ITEM_NOT_IN_MASTER',
  'fix',
  'Keep only items of the master, or add the item to the master first',
);
export const levelRaised = code('LEVEL_RAISED', 'fix', 'Keep the level of the master, or lower');
export const factChanged = code(
  'FACT_CHANGED',
  'fix',
  'Leave the field out of the profile, so the job keeps the value of the master',
);
export const jobMoved = code(
  'JOB_MOVED',
  'fix',
  'Take the job out of order, and hide an old or unrelated job instead of moving it',
);

// What does not fit the pages.
export const roleTooLong = code(
  'ROLE_TOO_LONG',
  'fix',
  'Shorten the role, in the master or with "person.role" in the profile',
);
export const blockTooTall = code(
  'BLOCK_TOO_TALL',
  'fix',
  'Shorten the block, for example by removing items',
);
export const pageOverflow = code(
  'PAGE_OVERFLOW',
  'fix',
  'Hide or shorten blocks of that column, remove a page pin, or raise "pages"',
);
