import { effect } from '@honeyglass/adx';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

export const add = effect({
  does: 'adds a bullet, a skill or an entry to a block',
  input: INPUT['item add'],
  example: { block: 'skills', value: 'Rust' },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item add', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const update = effect({
  does: 'changes one item of a block',
  input: INPUT['item update'],
  example: { block: 'skills', index: 0, value: 'Golang' },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const remove = effect({
  does: 'removes one item of a block',
  input: INPUT['item remove'],
  example: { block: 'skills', index: 0 },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item remove', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});

export const move = effect({
  does: 'moves one item inside its block',
  input: INPUT['item move'],
  example: { block: 'skills', index: 1, to: 0 },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'item move', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
