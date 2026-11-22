// The commands of this folder, by the word that calls each. rollback.ts is not here: the tool
// lists it at the top, as `ship rollback`.
import { create } from './create.ts';
import { releases } from './list.ts';
import { commands as notes } from './notes/commands.ts';
import { promote } from './promote.ts';
import { show } from './show.ts';

export const commands = { list: releases, show, create, promote, notes };
