// The tool: what it is, and the table of its commands. Only this folder combines the features.
import { after, tool } from '@honeyglass/adx';
import { api, project } from '../core/tracker.ts';
import { close } from '../tickets/close.ts';
import { create } from '../tickets/create.ts';
import { tickets } from '../tickets/list.ts';
import { schedule } from '../tickets/schedule.ts';
import { show } from '../tickets/show.ts';
import { stats } from '../tickets/stats.ts';
import { whoami } from '../user/whoami.ts';

export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  remotes: [api],
  global: project,
  commands: {
    ticket: { list: tickets, show, create, schedule, close },
    whoami,
    stats,
  },
  next: [after(whoami, () => [tickets.step()])],
  start: () => [tickets.step()],
});
