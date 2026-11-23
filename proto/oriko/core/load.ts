// The CV and the profile a command names, found, read and checked.
//
// The bodies are oriko's own code and not shown. What counts for adx is what each answers:
// its value, or the issues, each at a field of the call.
import type { File } from '@honeyglass/adx';
import type { Master } from './cv.schema.ts';
import type { Issues } from './issues.ts';

export type CvFile = { name: string; file: File };

/**
 * The CV a command works on: the one `--cv` names, or the only CV there is.
 * NO_CV (no field), CV_REQUIRED and UNKNOWN_CV at `cv`.
 */
export declare function chosenCv(cv: string | undefined): Promise<CvFile | Issues<'cv'>>;

/**
 * The same for a command that also takes `--profile`: the CV the profile names counts too.
 * CV_MISMATCH at `cv`, UNKNOWN_PROFILE at `profile`, UNKNOWN_CV at `['profile', 'cv']`.
 */
export declare function cvOfProfile(
  cv: string | undefined,
  profile: string | undefined,
): Promise<CvFile | Issues<'cv' | 'profile'>>;

/**
 * The checked CV, with the named profile applied.
 *
 * An issue inside a stored file stands below the field of the call that names the file (adx
 * decision 69): the unknown block of the profile `broken` stands at
 * `['profile', 'blocks', 'nobody']`, a duplicate id of the CV at `['cv', 'blocks', 'awards']`.
 * Today oriko answers `blocks.nobody` for both, a path into the file.
 */
export declare function checked(
  cv: string | undefined,
  profile: string | undefined,
): Promise<Master | Issues<'cv' | 'profile'>>;
