// Where the notes drafts of an app lie in the data folder, and which exist.
import { needs } from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';
import { home } from '../../core/home.ts';

export const draftFile = (app: string, name: string) => home.file(`notes/${app}/${name}.md`);

export const draftNames = async (app: string) =>
  (await home.list(`notes/${app}`, '.md')).map(f => f.stem);

export const draftChoices: Source<{ app: string }> = async ({ app }) =>
  app === undefined ? needs('app') : (await draftNames(app)).map(value => ({ value }));
