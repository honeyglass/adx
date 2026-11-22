// The commands of this folder, by the word that calls each.
import { vars } from './list.ts';
import { set } from './set.ts';
import { show } from './show.ts';

export const commands = { list: vars, show, set };
