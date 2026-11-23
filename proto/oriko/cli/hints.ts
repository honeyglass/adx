// The commands that help with a refusal and lie in another folder. The three codes lie in
// core/, which imports no feature, and every feature raises them, so their commands stand here.
//
// A hint gets nothing of the refused call. So the step to show cannot name the CV, where oriko
// answers `oriko show --cv jane --block` today (README, "What does not fit yet").
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
  // core/ to cv/: the outline of a CV lists its block ids
  hint(unknownBlock, () => show.step()),
];
