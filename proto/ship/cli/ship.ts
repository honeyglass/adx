// The tool: what it is, what its commands share, and the table of its commands.
import { tool } from '@honeyglass/adx';
import { whoami } from '../account/whoami.ts';
import { apps } from '../apps/list.ts';
import { status } from '../apps/status.ts';
import { app } from '../core/app.ts';
import { home } from '../core/home.ts';
import { api } from '../core/server.ts';
import { commands as env } from '../env/commands.ts';
import { commands as release } from '../releases/commands.ts';
import { releases } from '../releases/list.ts';
import { rollback } from '../releases/rollback.ts';
import { next } from './next.ts';

export const ship = tool({
  name: 'ship',
  version: '2.3.0',
  does: 'releases apps to their environments',
  roots: [home],
  remotes: [api],
  global: app,
  commands: {
    app: { list: apps },
    release,
    env,
    rollback,
    status,
    whoami,
  },
  next,
  start: () => [apps.step(), releases.step()],
});
