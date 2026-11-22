import { z } from 'zod';
import { read } from '../core/app.ts';
import { api } from '../core/server.ts';

export const status = read({
  does: 'counts the live releases of one app, or of all',
  global: { app: 'optional' },
  run: ({ app }) => {
    const path = app === undefined ? ['status'] : ['apps', app, 'status'];
    return api.get(path, z.object({ live: z.number(), frozen: z.number() }));
  },
});
