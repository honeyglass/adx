import { z } from 'zod';
import { api, read } from '../core/tracker.ts';

export const stats = read({
  does: 'counts the tickets of one project, or of all',
  global: { project: 'optional' },
  run: ({ project }) => {
    const path = project === undefined ? ['stats'] : ['projects', project, 'stats'];
    return api.get(path, z.object({ open: z.number(), closed: z.number() }));
  },
});
