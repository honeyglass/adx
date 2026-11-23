// The tool: what it is, what its commands share, and the table of its commands.
import { tool } from '@honeyglass/adx';
import { set as photoSet } from '../classic/photo.ts';
import { Block, ContactItem, Item, Master, Profile } from '../core/cv.schema.ts';
import { cvNames, home, profileNames, work } from '../core/home.ts';
import { init } from '../cv/init.ts';
import { cvs } from '../cv/list.ts';
import { show } from '../cv/show.ts';
import { commands as edit } from '../edit/commands.ts';
import { profiles } from '../profile/list.ts';
import { set as profileSet } from '../profile/set.ts';
import { show as profileShow } from '../profile/show.ts';
import { read } from '../read/documents.ts';
import { build, preview } from './build.ts';
import { hints } from './hints.ts';
import { next } from './next.ts';
import { plan } from './plan.ts';

export const oriko = tool({
  name: 'oriko',
  version: '0.1.0',
  does: 'builds a two-column CV as .docx or PDF from a master file and a profile per job posting',
  roots: [home, work],
  // What a caller writes and no command takes whole. profile, block, item and contact share
  // their word with a group: `oriko schema profile` is the shape, `oriko schema profile set`
  // the command.
  shapes: { master: Master, profile: Profile, block: Block, item: Item, contact: ContactItem },
  commands: {
    cvs,
    init,
    show,
    profiles,
    plan,
    preview,
    build,
    read,
    profile: { set: profileSet, show: profileShow },
    photo: { set: photoSet },
    ...edit,
  },
  next,
  hints,
  // Where to start depends on what the data folder holds: no CV, CVs only, or CVs and profiles.
  // The answer itself holds none of it: `oriko cvs` and `oriko profiles` list it.
  start: async () => {
    if ((await cvNames()).length === 0) return [read.step().needs('resume'), init.step()];
    const posting = read.step().needs('posting', 'profile');
    return (await profileNames()).length === 0 ? [cvs.step(), posting] : [profiles.step(), posting];
  },
});
