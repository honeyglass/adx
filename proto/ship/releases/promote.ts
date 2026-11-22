import { z } from 'zod';
import { id, keyOf } from '@honeyglass/adx';
import { effect } from '../core/app.ts';
import { Env } from '../core/env.schema.ts';
import * as shared from '../core/issues.ts';
import { api } from '../core/server.ts';
import { envChoices } from '../core/sources.ts';
import * as issue from './issues.ts';
import { releases } from './list.ts';
import { Release } from './release.schema.ts';
import { rollback } from './rollback.ts';
import { show } from './show.ts';

export const promote = effect({
  does: 'makes a release live in an environment',
  input: z.object({
    release: id().describe('the release key'),
    env: z.string().describe('the environment to release to'),
  }),
  example: { release: 'r214', env: 'staging' },
  values: { release: keyOf(releases), env: envChoices },
  replace: false,
  plan: async ({ app, release, env }, { refuse }) => {
    const target = await api.get(['apps', app, 'envs', env], Env);
    const path = ['apps', app, 'releases', release];
    const found = await api.get(path, Release, { on: { 404: undefined } });
    // both checks cost a request, so one answer names both
    const issues = [];
    if (target.frozen) issues.push(shared.frozen.at('env', `${env} is frozen`));
    if (found === undefined) issues.push(issue.noRelease.at('release'));
    if (found?.state === 'retired') issues.push(issue.retired.at('release'));
    const [first, ...more] = issues;
    if (first !== undefined) return refuse(first, ...more);
    return { app, release, env, replaces: target.release ?? null };
  },
  apply: async ({ app, release, env }, { act }) => {
    const request = api.put(['apps', app, 'envs', env, 'release'], { release });
    return { live: await act.send('the promotion', request, Env) };
  },
  look: ({ release }) => show.step({ release }),
  next: (_, { env }) => [rollback.step({ env })],
});
