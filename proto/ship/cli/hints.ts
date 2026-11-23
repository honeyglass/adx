// The commands that help with a refusal and lie in another feature. A code in core/ imports no
// feature, and the handler that refuses imports only its own, so such a command stands here.
import { hint } from '@honeyglass/adx';
import { frozen } from '../core/issues.ts';
import { envs } from '../env/list.ts';

export const hints = [
  // core/ to env/: the list of environments shows which are frozen
  hint(frozen, () => envs.step()),
];
