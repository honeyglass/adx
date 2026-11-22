import { z } from 'zod';
import { paged } from '@honeyglass/adx';
import { list } from '../../core/app.ts';
import { api } from '../../core/server.ts';
import { envChoices } from '../../core/sources.ts';
import { Var } from './var.schema.ts';

export const vars = list({
  does: 'lists the variables of an environment',
  input: z.object({ env: z.string().describe('the environment') }),
  example: { env: 'staging' },
  values: { env: envChoices },
  item: Var,
  key: 'key',
  outline: ['secret', 'updated'],
  run: async ({ app, env }, { page }) => {
    const all = await api.get(['apps', app, 'envs', env, 'vars'], z.array(Var));
    return paged(all, page);
  },
});
