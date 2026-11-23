import { z } from 'zod';
import { effect, fresh } from '@honeyglass/adx';
import type { Changes, Issue } from '@honeyglass/adx';
import { Id, Master, Profile } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { jsonText, profileFile, profileNames } from '../core/home.ts';
import { unknownBlock } from '../core/issues.ts';
import { chosenCv } from '../core/load.ts';
import { fit } from '../core/place.ts';
import { cvChoices } from '../core/sources.ts';

/**
 * The facts of the master a profile may not change: FACT_CHANGED at `['blocks', id, field]`,
 * LEVEL_RAISED and ITEM_NOT_IN_MASTER at `['blocks', id, 'items']`, JOB_MOVED at `order`, and
 * WRONG_SHAPE at `['blocks', id]` for a patch that does not fit the kind of its block.
 */
declare function factIssues(master: Master, profile: Profile): Issue<'blocks' | 'order'>[];
/** The CV as the profile changes it. */
declare function applied(master: Master, profile: Profile): Master;
/** The parts a profile adds, changes and removes: each top-level field, and each block one level down. */
declare function changesOf(before: Profile, after: Profile): Changes;

export const set = effect({
  does: 'stores the profile of one job posting, checked against its CV',
  // The name and the profile fill one object, so --profile and --json go together as today.
  input: z.object({ profile: Id.describe('the name of the profile'), ...Profile.shape }),
  example: { profile: 'globex', cv: 'jane', blocks: { freelance: { hidden: true } } },
  values: { profile: fresh(profileNames), cv: cvChoices },
  plan: async ({ profile: name, ...profile }, { files, refuse }) => {
    const cv = await chosenCv(profile.cv);
    if (Array.isArray(cv)) return refuse(...cv);
    const master = await cv.file.json(FILE_LIMITS.inputBytes, Master);
    const known = new Set(master.blocks.map(block => block.id));
    // A path below a field: the block the profile names, and the place in its order.
    const issues = [
      ...Object.keys(profile.blocks ?? {})
        .filter(id => known.has(id) === false)
        .map(id => unknownBlock.at(['blocks', id], `No block has the id ${id}`)),
      ...(profile.order ?? []).flatMap((id, index) =>
        known.has(id) ? [] : [unknownBlock.at(['order', index], `No block has the id ${id}`)],
      ),
      ...factIssues(master, profile),
    ];
    const [first, ...more] = issues;
    if (first !== undefined) return refuse(first, ...more);
    const file = profileFile(name);
    const old = file.exists ? await file.json(FILE_LIMITS.inputBytes, Profile) : {};
    // A stored profile is replaced only with --replace: files.write refuses with ALREADY_EXISTS.
    const written = files.write(file, jsonText(profile));
    // The changes in the profile's own words, which adx keeps in place of its JSON paths.
    return {
      ...written,
      changes: changesOf(old, profile),
      cv: cv.name,
      ...fit(applied(master, profile)),
    };
  },
});
