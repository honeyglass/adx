// The commands of this folder, by the word that calls each.
import { add } from './add.ts';
import { domains } from './list.ts';

export const commands = { list: domains, add };
