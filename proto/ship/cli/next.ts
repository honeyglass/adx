// The steps that lead from one feature into another. A feature imports no other feature, so its
// own `next` cannot name them: they stand here, where the features meet.
import { after } from '@honeyglass/adx';
import { envs } from '../env/list.ts';
import { set } from '../env/vars/set.ts';
import { promote } from '../releases/promote.ts';

export const next = [
  // releases/ to env/: after a promotion, the environments show what is live where
  after(promote, () => [envs.step()]),
  // env/ to releases/: a changed variable takes effect with the next promotion
  after(set, (_, { env }) => [promote.step({ env })]),
];
