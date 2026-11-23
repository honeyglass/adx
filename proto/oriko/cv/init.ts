import { z } from 'zod';
import { effect, fresh } from '@honeyglass/adx';
import { Id, NewCv } from '../core/cv.schema.ts';
import { cvFile, cvNames, home, jsonText } from '../core/home.ts';
import * as issue from './issues.ts';

/**
 * The one placeholder photo, directly in the data folder: `~/.oriko/placeholder.png`. It lies
 * outside cvs/, so no name of a CV can meet it, `placeholder` included. A new CV names it until
 * its first photo set.
 */
const PLACEHOLDER = 'placeholder.png';

/**
 * The bytes of the placeholder, `assets/placeholder.png` of the package. It lies in no root of
 * the tool, so reading it stays oriko's own code (README, "What does not fit yet").
 */
declare function placeholder(): Promise<Uint8Array>;

export const init = effect({
  does: 'creates a CV',
  input: z.object({ cv: Id.describe('the name of the new CV'), ...NewCv.shape }),
  example: {
    cv: 'erika',
    language: 'de',
    firstName: 'Erika',
    lastName: 'Muster',
    role: 'Entwicklerin',
  },
  values: { cv: fresh(cvNames) },
  // init never replaces a CV: cv update and the block commands change one.
  replace: false,
  plan: async ({ cv, language, ...person }, { files, refuse }) => {
    if ((await cvNames()).includes(cv))
      return refuse(issue.cvExists.at('cv', `The data folder already holds a CV ${cv}`));
    // Two pages and an English contact title, the same defaults as the example; cv update changes both.
    const master = {
      language,
      person: { ...person, photo: PLACEHOLDER },
      contact: { title: 'Contact', items: [] },
      pages: 2,
      blocks: [],
    };
    // The placeholder is written once, when it is missing, so a second init replaces nothing.
    // adx writes the staged files all or none, so a CV never names a photo that is not there.
    const shared = home.file(PLACEHOLDER);
    return {
      photo: PLACEHOLDER,
      placeholder: shared.exists ? undefined : files.write(shared, await placeholder()),
      cv: files.write(cvFile(cv), jsonText(master)),
    };
  },
});
