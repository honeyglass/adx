import { z } from 'zod';
import { id, keyOf, tell } from '@honeyglass/adx';
import { effect } from '../../core/app.ts';
import { Env } from '../../core/env.schema.ts';
import * as shared from '../../core/issues.ts';
import { api } from '../../core/server.ts';
import { envChoices } from '../../core/sources.ts';
import * as issue from '../issues.ts';
import { vars } from './list.ts';
import { show } from './show.ts';
import { Var } from './var.schema.ts';

export const set = effect({
  does: 'changes one variable of an environment',
  input: z.object({
    env: z.string().describe('the environment'),
    key: id().describe('the variable to change'),
    value: z.string().describe('the new value'),
  }),
  example: { env: 'staging', key: 'PAYMENT_URL', value: 'https://pay.example.com' },
  values: { env: envChoices, key: keyOf(vars) },
  replace: false,
  plan: async ({ app, env, key }, { refuse }) => {
    const target = await api.get(['apps', app, 'envs', env], Env);
    if (target.frozen) return refuse(shared.frozen.at('env', `${env} is frozen`));
    const path = ['apps', app, 'envs', env, 'vars', key];
    const old = await api.get(path, Var, { on: { 404: undefined } });
    return old === undefined
      ? refuse(issue.noVar.at('key', `${env} has no variable ${key}`))
      : { env, key, secret: old.secret, changedBefore: old.updated };
  },
  apply: async ({ app, env, key, value }, { act }) => {
    const request = api.put(['apps', app, 'envs', env, 'vars', key], { value });
    return { variable: await act.send('the changed variable', request, Var) };
  },
  look: ({ env, key }) => show.step({ env, key }),
  next: (_, { env }) => [tell(`restart ${env} in the web console, so it reads the new value`)],
});
