// The plan every edit command shares: one edit applied to the stored CV, then staged.
import type { Files, Written } from '@honeyglass/adx';
import { Master } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import type { Issues } from '../core/issues.ts';
import { chosenCv } from '../core/load.ts';
import { jsonText } from '../core/home.ts';
import { fit } from '../core/place.ts';
import type { Fit } from '../core/place.ts';

/**
 * @param cv - the CV the call names, if any
 * @param files - the files of the plan
 * @param edit - the edit, which answers the changed CV or its issues
 * @returns what was staged and whether the CV still fits its pages, or every issue
 */
export async function saved<F extends string>(
  cv: string | undefined,
  files: Files,
  edit: (master: Master) => Master | Issues<F>,
): Promise<(Written & Fit) | Issues<F | 'cv'>> {
  const chosen = await chosenCv(cv);
  if (Array.isArray(chosen)) return chosen;
  const master = await chosen.file.json(FILE_LIMITS.inputBytes, Master);
  const edited = edit(master);
  if (Array.isArray(edited)) return edited;
  // An edit exists to change the CV file, so it updates and takes no --replace.
  const written = await files.update(chosen.file, FILE_LIMITS.inputBytes, () => jsonText(edited));
  // An edit may make the CV too long. The edit still stands; the answer says so.
  return { ...written, ...fit(edited) };
}
