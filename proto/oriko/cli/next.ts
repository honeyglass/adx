// The steps that lead from one folder into another. A feature imports no other feature, and
// plan, preview and build live in cli/, so the `next` of a feature cannot name them: they stand
// here, where the features meet.
//
// Not here: the steps to adx's own `schema` command. oriko names `oriko schema profile` after a
// read posting and `oriko schema init` after an old CV was read. adx gives no step to its own
// command (README, "What does not fit yet").
import { after } from '@honeyglass/adx';
import { set as photoSet } from '../classic/photo.ts';
import { init } from '../cv/init.ts';
import { cvs } from '../cv/list.ts';
import { show } from '../cv/show.ts';
import * as block from '../edit/block.ts';
import * as contact from '../edit/contact.ts';
import * as cvEdit from '../edit/cv.ts';
import * as item from '../edit/item.ts';
import { profiles } from '../profile/list.ts';
import { set as profileSet } from '../profile/set.ts';
import { show as profileShow } from '../profile/show.ts';
import { read } from '../read/documents.ts';
import { build, preview } from './build.ts';
import { plan } from './plan.ts';

// The one step after every edit: a CV that still fits its pages is ready to draw and to build.
const fitted = (out: { fits: boolean }, { cv }: { cv?: string | undefined }) =>
  out.fits ? [preview.step({ cv }), build.step({ cv })] : [];

export const next = [
  // cv/ to profile/
  after(cvs, () => [profiles.step()]),
  // cv/ to edit/ and classic/: a new CV is empty and has a placeholder photo
  after(init, (_, { cv }) => [
    contact.add.step({ cv }),
    block.add.step({ cv }),
    photoSet.step({ cv }),
  ]),
  // profile/ to cli/
  after(profiles, out => (out.items.length > 0 ? [plan.step().needs('profile')] : [])),
  after(profileSet, (out, { profile }) =>
    out.fits ? [preview.step({ profile }), build.step({ profile })] : [],
  ),
  after(profileShow, out => (out.profile === null ? [] : [plan.step({ profile: out.name })])),
  // classic/ to cli/
  after(photoSet, (_, { cv, profile }) => [build.step({ cv, profile })]),
  // read/ to profile/ and cv/: a posting leads to storing its profile, notes to the CV they
  // belong to, an old CV to a new one
  after(read, out => {
    const roles = out.read.map(document => document.role);
    const steps = [
      ...(roles.includes('posting') && out.profile !== undefined
        ? [profileSet.step({ profile: out.profile })]
        : []),
      ...(roles.includes('notes') && out.cv !== undefined ? [show.step({ cv: out.cv })] : []),
    ];
    return steps.length > 0 ? steps : [init.step()];
  }),
  // edit/ to cli/, one line per edit: `after` types each command on its own
  after(block.add, fitted),
  after(block.update, fitted),
  after(block.remove, fitted),
  after(block.move, fitted),
  after(item.add, fitted),
  after(item.update, fitted),
  after(item.remove, fitted),
  after(item.move, fitted),
  after(cvEdit.update, fitted),
  after(contact.add, fitted),
  after(contact.update, fitted),
  after(contact.remove, fitted),
  after(contact.move, fitted),
];
