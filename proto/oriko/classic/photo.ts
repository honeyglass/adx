import { z } from 'zod';
import { effect } from '@honeyglass/adx';
import type { File } from '@honeyglass/adx';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home } from '../core/home.ts';
import type { Issues } from '../core/issues.ts';
import { cv, profile } from '../core/options.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { squarePhoto } from './images.ts';

/** The file that names the photo, and where the photo goes: `cvs/NAME.png` or `profiles/NAME.png`. */
type Owner = { file: File; photo: string };
/** The CV, or the profile when one is named. NO_CV, CV_REQUIRED at `cv`, UNKNOWN_PROFILE at `profile`. */
declare function ownerOf(
  cv: string | undefined,
  profile: string | undefined,
): Promise<Owner | Issues<'cv' | 'profile'>>;
/** The stored CV or profile with its field person.photo set. */
declare function withPhoto(stored: string, photo: string): string;

export const set = effect({
  does: 'stores the square photo of a CV, or of one profile',
  input: z.object({
    // Today the picture is a word after the command; adx has no words after a command, so it
    // is an option. It may lie anywhere on the disk, as today, so it is a plain path that
    // oriko's own code reads (./images.ts), not an inFile of a root.
    file: z.string().describe('the picture, a PNG or JPEG file'),
    cv,
    profile,
  }),
  example: { file: 'me.png' },
  values: { cv: cvChoices, profile: profileChoices },
  plan: async ({ file, cv, profile }, { files, refuse }) => {
    const owner = await ownerOf(cv, profile);
    if (Array.isArray(owner)) return refuse(...owner);
    const picture = await squarePhoto(file);
    if (Array.isArray(picture)) return refuse(...picture);
    return {
      // The first photo is a new file: a new CV names the shared placeholder, and a profile
      // has no photo of its own. A photo is kept data, so a second photo set finds the file
      // and needs --replace (adx decision 70).
      photo: files.write(home.file(owner.photo), picture),
      owner: await files.update(owner.file, FILE_LIMITS.inputBytes, old =>
        withPhoto(old, owner.photo),
      ),
    };
  },
});
