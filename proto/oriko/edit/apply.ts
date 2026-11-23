// One edit applied to a CV. The body is oriko's own code, 329 lines today, and not shown.
import type { Field } from '@honeyglass/adx';
import type { z } from 'zod';
import type { Master } from '../core/cv.schema.ts';
import type { Issues } from '../core/issues.ts';
import type { EditName, INPUT } from './edit.schema.ts';

/**
 * The edited CV, or the issues, each at a field of the edit's input:
 * - UNKNOWN_BLOCK at `id`, `block`, `before` or `after`
 * - NOTHING_TO_DO with no field, BOTH_ANCHORS at `after`, OTHER_COLUMN at `before` or `after`
 * - INDEX_OUT_OF_RANGE at `index` or `to`
 * - WRONG_SHAPE at `value` or `set`, when the part does not fit the kind of its block
 * - DUPLICATE_ID at `['block', 'id']`, UNTITLED_NOT_ALONE at `block`, `id` or `set`
 */
export declare function apply<Name extends EditName>(
  master: Master,
  command: Name,
  input: z.output<(typeof INPUT)[Name]>,
): Master | Issues<Field<(typeof INPUT)[Name]>>;
