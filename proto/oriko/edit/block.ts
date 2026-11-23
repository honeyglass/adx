import { effect } from '@honeyglass/adx';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const add = effect({
  does: 'adds a block, such as a job or a skill group',
  input: INPUT['block add'],
  example: { block: { id: 'tools', kind: 'list', section: 'Tools', items: ['Vim'] } },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block add', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const update = effect({
  does: 'changes fields of a block',
  input: INPUT['block update'],
  example: { id: 'tools', set: { section: 'Werkzeuge' } },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const remove = effect({
  does: 'removes a block',
  input: INPUT['block remove'],
  example: { id: 'tools' },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block remove', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const move = effect({
  does: 'moves a block, or pins it to a page',
  input: INPUT['block move'],
  example: { id: 'tools', before: 'skills', page: 2 },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'block move', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
