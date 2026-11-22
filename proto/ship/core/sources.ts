// The lists two features need: the apps, and the environments of one app.
import { z } from 'zod';
import { needs } from '@honeyglass/adx';
import type { Source } from '@honeyglass/adx';
import { api } from './server.ts';

const Named = z.array(z.object({ name: z.string(), description: z.string().default('') }));

// An app is called by its key; its name only says which app that is.
export const appChoices = async () => {
  const apps = await api.get(['apps'], z.array(z.object({ key: z.string(), name: z.string() })));
  return apps.map(a => ({ value: a.key, does: a.name }));
};

export const envChoices: Source<{ app: string }> = async ({ app }) => {
  if (app === undefined) return needs('app');
  const all = await api.get(['apps', app, 'envs'], Named);
  return all.map(e => ({ value: e.name, does: e.description }));
};
