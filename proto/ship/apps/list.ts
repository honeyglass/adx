import { z } from 'zod';
import { id, paged } from '@honeyglass/adx';
import { list } from '../core/app.ts';
import { api } from '../core/server.ts';

const App = z.object({
  key: id().describe('the app key, such as shop-web'),
  name: z.string().describe('the name people use'),
  team: z.string().describe('the team that owns it'),
});

export const apps = list({
  does: 'lists the apps you can release',
  global: false,
  item: App,
  key: 'key',
  outline: ['name', 'team'],
  run: async (_, { page }) => paged(await api.get(['apps'], z.array(App)), page),
});
