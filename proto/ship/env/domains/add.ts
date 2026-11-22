import { z } from 'zod';
import { effect } from '../../core/app.ts';
import { api } from '../../core/server.ts';
import { envChoices } from '../../core/sources.ts';
import * as issue from '../issues.ts';
import { Domain } from './domain.schema.ts';
import { domains } from './list.ts';

export const add = effect({
  does: 'serves an environment under one more host name',
  input: z.object({
    env: z.string().describe('the environment'),
    host: z.string().describe('the host name, such as beta.shop.example.com'),
  }),
  example: { env: 'staging', host: 'beta.shop.example.com' },
  values: { env: envChoices },
  replace: false,
  check: ({ host }) => (/^[a-z0-9.-]+$/.test(host) ? [] : [issue.badHost.at('host')]),
  plan: async ({ app, env, host }, { refuse }) => {
    const served = await api.get(['apps', app, 'envs', env, 'domains'], z.array(Domain));
    return served.some(d => d.host === host)
      ? refuse(issue.hostTaken.at('host', `${env} already serves ${host}`))
      : { env, host };
  },
  apply: async ({ app, env, host }, { act }) => {
    const request = api.post(['apps', app, 'envs', env, 'domains'], { host });
    return { domain: await act.send('the new host name', request, Domain) };
  },
  look: ({ env }) => domains.step({ env }),
});
