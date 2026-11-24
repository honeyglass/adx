/**
 * The values of a field: where they come from, the option that lists them, and the values a call
 * may give.
 *
 * needs, fresh, keyOf, detailOf: what a source answers, and the three sources adx makes.
 * sources: the port a command asks its sources through, which the tool hands each command.
 *
 * @example placeAll(spec.commands, { name, through, sources });
 */
import type { Sources } from '../core/index.ts';
import { accepts } from './accepts.ts';
import { listed } from './listed.ts';
import { listStep } from './liststep.ts';
import { outside } from './outside.ts';

export { fresh } from './fresh.ts';
export { needs } from './needs.ts';
export { detailOf, keyOf } from './ref.ts';

export const sources: Sources = { listed, outside, accepts, listStep };
