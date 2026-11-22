// The commands of this folder, by the word that calls each. The folders vars/ and domains/ are
// called by the singular: `ship env var set`, `ship env domain add`.
import { commands as domain } from './domains/commands.ts';
import { envs } from './list.ts';
import { commands as variable } from './vars/commands.ts';

export const commands = { list: envs, var: variable, domain };
