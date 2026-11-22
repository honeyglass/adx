import { z } from 'zod';
import { paged } from '@honeyglass/adx';
import { list } from '../core/app.ts';
import { Env } from '../core/env.schema.ts';
import { api } from '../core/server.ts';

export const envs = list({
  does: 'lists the environments of an app',
  item: Env,
  key: 'name',
  outline: ['url', 'release', 'previous', 'frozen'],
  run: async ({ app }, { page }) => paged(await api.get(['apps', app, 'envs'], z.array(Env)), page),
});
