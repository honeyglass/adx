import { z } from 'zod';
import { paged } from '@honeyglass/adx';
import { list } from '../../core/app.ts';
import { api } from '../../core/server.ts';
import { envChoices } from '../../core/sources.ts';
import { Domain } from './domain.schema.ts';

export const domains = list({
  does: 'lists the host names of an environment',
  input: z.object({ env: z.string().describe('the environment') }),
  example: { env: 'staging' },
  values: { env: envChoices },
  item: Domain,
  key: 'host',
  outline: ['tls'],
  run: async ({ app, env }, { page }) => {
    const all = await api.get(['apps', app, 'envs', env, 'domains'], z.array(Domain));
    return paged(all, page);
  },
});
