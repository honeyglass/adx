// One edit applied to a CV. The body is oriko's own code, 329 lines today, and not shown.
import { check } from '@honeyglass/adx';
import type { Field } from '@honeyglass/adx';
import type { z } from 'zod';
import { Block, ITEM, ITEM_PATCH, Item, PATCH } from '../core/cv.schema.ts';
import type { Master } from '../core/cv.schema.ts';
import type { Issues } from '../core/issues.ts';
import type { EditName, INPUT } from './edit.schema.ts';

// What adx carries of apply: the check of a part whose shape the kind of its block picks. The
// input says `unknown` or a union there, so apply checks the part once it has found the block,
// and adx answers SCHEMA at the part, such as `value.level` (adx decision 78). The shape one
// kind takes stands in no `shapes`, so `as` names the shape whose schema the issue shows:
// `oriko schema item` or `oriko schema block`, as today.
/** The `value` of item add, as a block of this kind takes an item. */
export const itemOf = (block: Block, value: unknown) =>
  check(ITEM[block.kind], value, ['value'], { as: Item });
/** The `value` of item update: the fields of an item to change. */
export const itemPatchOf = (block: Block, value: unknown) =>
  check(ITEM_PATCH[block.kind], value, ['value'], { as: Item });
/** The `set` of block update: the fields of a block to change. */
export const blockPatchOf = (block: Block, set: unknown) =>
  check(PATCH[block.kind], set, ['set'], { as: Block });

/**
 * The edited CV, or the issues, each at a field of the edit's input:
 * - UNKNOWN_BLOCK at `id`, `block`, `before` or `after`
 * - NOTHING_TO_DO with no field, BOTH_ANCHORS at `after`, OTHER_COLUMN at `before` or `after`
 * - INDEX_OUT_OF_RANGE at `index` or `to`
 * - SCHEMA at or below `value` or `set`, from the three checks above
 * - DUPLICATE_ID at `['block', 'id']`, UNTITLED_NOT_ALONE at `block`, `id` or `set`
 */
export declare function apply<Name extends EditName>(
  master: Master,
  command: Name,
  input: z.output<(typeof INPUT)[Name]>,
): Master | Issues<Field<(typeof INPUT)[Name]>>;
