import { z } from 'zod';
import { list } from '../core/app.ts';
import { api } from '../core/server.ts';
import { Release } from './release.schema.ts';

const Page = z.object({ items: z.array(Release), next: z.string().optional(), total: z.number() });

export const releases = list({
  does: 'lists the releases of an app',
  input: z.object({
    state: z.enum(['built', 'live', 'retired']).optional().describe('only releases in this state'),
  }),
  item: Release,
  key: 'id',
  outline: ['state', 'author'],
  run: ({ app, state }, { page }) => {
    const query = { state, cursor: page.cursor, limit: page.size };
    return api.get(['apps', app, 'releases'], Page, { query });
  },
});
