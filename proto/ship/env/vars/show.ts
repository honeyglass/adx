import { z } from 'zod';
import { detailOf, id } from '@honeyglass/adx';
import { read } from '../../core/app.ts';
import { api } from '../../core/server.ts';
import { envChoices } from '../../core/sources.ts';
import * as issue from '../issues.ts';
import { vars } from './list.ts';
import { Var } from './var.schema.ts';

export const show = read({
  does: 'shows one variable in full',
  input: z.object({
    env: z.string().describe('the environment'),
    key: id().describe('the variable'),
  }),
  example: { env: 'staging', key: 'PAYMENT_URL' },
  values: { env: envChoices, key: detailOf(vars) },
  output: Var,
  run: async ({ app, env, key }, { refuse }) => {
    const path = ['apps', app, 'envs', env, 'vars', key];
    const found = await api.get(path, Var, { on: { 404: undefined } });
    return found ?? refuse(issue.noVar.at('key', `${env} has no variable ${key}`));
  },
});
