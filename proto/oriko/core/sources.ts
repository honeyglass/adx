// The lists several features need: the CVs, the profiles, and the blocks of one CV.
import { needs } from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';
import { cvNames, profileNames } from './home.ts';
import { checked } from './load.ts';

export const cvChoices = async () => (await cvNames()).map(value => ({ value }));

export const profileChoices = async () => (await profileNames()).map(value => ({ value }));

// The blocks of the CV the call names. With several CVs and none named, the CV comes first.
export const blockChoices: Source<{ cv: string; profile: string }> = async ({ cv, profile }) => {
  const names = await cvNames();
  if (cv === undefined && profile === undefined && names.length > 1) return needs('cv');
  const master = await checked(cv, profile);
  if (Array.isArray(master)) return [];
  return master.blocks.map(block => ({
    value: block.id,
    does: `${block.kind} in ${block.section}`,
  }));
};
