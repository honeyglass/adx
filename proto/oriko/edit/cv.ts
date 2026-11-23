import { effect } from '@honeyglass/adx';
import { apply } from './apply.ts';
import { INPUT } from './edit.schema.ts';
import { saved } from './save.ts';

// The photo stays out of reach here: photo set writes the picture and its path together.
export const update = effect({
  does: 'changes the language, the pages, the person or the contact title',
  input: INPUT['cv update'],
  example: { pages: 1 },
  replace: false,
  plan: async (input, { files, refuse }) => {
    const done = await saved(input.cv, files, master => apply(master, 'cv update', input));
    return Array.isArray(done) ? refuse(...done) : done;
  },
});
