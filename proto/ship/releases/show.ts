import { z } from 'zod';
import { detailOf, id } from '@honeyglass/adx';
import { read } from '../core/app.ts';
import { api } from '../core/server.ts';
import * as issue from './issues.ts';
import { releases } from './list.ts';
import { Release } from './release.schema.ts';

export const show = read({
  does: 'shows one release in full',
  input: z.object({ release: id().describe('the release key') }),
  example: { release: 'r214' },
  values: { release: detailOf(releases) },
  output: Release,
  run: async ({ app, release }, { refuse }) => {
    const path = ['apps', app, 'releases', release];
    const found = await api.get(path, Release, { on: { 404: undefined } });
    return found ?? refuse(issue.noRelease.at('release', `${app} has no release ${release}`));
  },
});
