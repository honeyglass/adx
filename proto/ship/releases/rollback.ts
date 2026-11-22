import { z } from 'zod';
import { effect } from '../core/app.ts';
import { Env } from '../core/env.schema.ts';
import { api } from '../core/server.ts';
import { envChoices } from '../core/sources.ts';
import * as issue from './issues.ts';
import { releases } from './list.ts';

export const rollback = effect({
  does: 'puts the release that was live before back',
  input: z.object({ env: z.string().describe('the environment to roll back') }),
  example: { env: 'staging' },
  values: { env: envChoices },
  replace: false,
  plan: async ({ app, env }, { refuse }) => {
    const { release, previous } = await api.get(['apps', app, 'envs', env], Env);
    if (release === undefined) return refuse(issue.noPrevious.at('env', `${env} has no release`));
    return previous === undefined
      ? refuse(issue.noPrevious.at('env', `${env} had no release before ${release}`))
      : { app, env, from: release, to: previous };
  },
  apply: async ({ app, env }, { act, planned }) => {
    const request = api.put(['apps', app, 'envs', env, 'release'], { release: planned.to });
    return { live: await act.send('the rollback', request, Env) };
  },
  look: () => releases.step({ state: 'live' }),
});
