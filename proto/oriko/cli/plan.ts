import { z } from 'zod';
import { read } from '@honeyglass/adx';
import { checked } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { Plan, place } from '../core/place.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { build, preview } from './build.ts';

export const plan = read({
  does: 'places every block on the pages',
  input: z.object({ cv, profile }),
  values: { cv: cvChoices, profile: profileChoices },
  output: Plan,
  run: async ({ cv, profile }, { refuse }) => {
    const master = await checked(cv, profile);
    if (Array.isArray(master)) return refuse(...master);
    const placed = place(master);
    return Array.isArray(placed) ? refuse(...placed) : placed;
  },
  next: (_, { cv, profile }) => [preview.step({ cv, profile }), build.step({ cv, profile })],
});
