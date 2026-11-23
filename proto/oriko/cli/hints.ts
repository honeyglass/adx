// The commands that help with a refusal and lie in another folder. The three codes lie in
// core/, which imports no feature, and every feature raises them, so their commands stand here.
import { hint } from '@honeyglass/adx';
import { noCv, unknownBlock, unknownCv } from '../core/issues.ts';
import { init } from '../cv/init.ts';
import { cvs } from '../cv/list.ts';
import { show } from '../cv/show.ts';

export const hints = [
  // core/ to cv/: without a CV, the first thing to do is to create one
  hint(noCv, () => init.step()),
  // core/ to cv/: the list names the CVs a profile may belong to
  hint(unknownCv, () => cvs.step()),
  // core/ to cv/: show lists the block ids of a CV. The step takes --cv and --profile from the
  // refused call and names --block without a value, so it lists the blocks of the CV that call
  // worked on. A profile that is not stored yet, as in profile set, stays out: the source of
  // --profile in show does not list it (adx decision 79).
  hint(unknownBlock, () => show.step().carry('cv', 'profile').lists('block')),
];
