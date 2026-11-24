/**
 * The values of a field: where they come from, the option that lists them, and the values a call
 * may give.
 *
 * needs, fresh, keyOf, detailOf: what a source answers, and the three sources adx makes.
 * refOf: the list and role a keyOf() or detailOf() names.
 * sources: the port a command asks its sources through, which the tool hands each command.
 *
 * @example placeAll(spec.commands, { name, through, sources });
 */
import type { Sources } from '../core/index.ts';
export { fresh } from './fresh.ts';
export { needs } from './needs.ts';
export { detailOf, keyOf, refOf } from './ref.ts';
export declare const sources: Sources;
