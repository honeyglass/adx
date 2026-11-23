// The input of every edit command: the CV it changes, and the edit itself.
// --cv and --json fill one object, so a call reads as today:
// oriko block move --cv jane --json '{"id":"awards","page":2}'
import { z } from 'zod';
import { CV_LIMITS } from '../core/cv.limits.ts';
import { Block, ContactItem, Id, Item, Language, Page, Text } from '../core/cv.schema.ts';
import { cv } from '../core/options.ts';

const index = z.int().min(0).max(CV_LIMITS.items);

export const INPUT = {
  'block add': z.strictObject({ cv, block: Block, before: Id.optional(), after: Id.optional() }),
  'block update': z.strictObject({ cv, id: Id, set: z.record(z.string(), z.unknown()) }),
  'block remove': z.strictObject({ cv, id: Id }),
  // `page` stays: an effect has no --page of adx (adx decision 71).
  'block move': z.strictObject({
    cv,
    id: Id,
    before: Id.optional(),
    after: Id.optional(),
    page: Page.nullable().optional(),
  }),
  // A whole item is one of the shapes of `oriko schema item`; which one, the kind of the block decides.
  'item add': z.strictObject({ cv, block: Id, value: Item, index: index.optional() }),
  // A patch of an item has the shape its kind takes, so only the handler can check it.
  'item update': z.strictObject({ cv, block: Id, index, value: z.unknown() }),
  'item remove': z.strictObject({ cv, block: Id, index }),
  'item move': z.strictObject({ cv, block: Id, index, to: index }),
  'cv update': z.strictObject({
    cv,
    language: Language.optional(),
    pages: Page.optional(),
    person: z.strictObject({ firstName: Text, lastName: Text, role: Text }).partial().optional(),
    contact: z.strictObject({ title: Text }).optional(),
  }),
  'contact add': z.strictObject({ cv, value: ContactItem, index: index.optional() }),
  'contact update': z.strictObject({ cv, index, value: ContactItem.partial() }),
  'contact remove': z.strictObject({ cv, index }),
  'contact move': z.strictObject({ cv, index, to: index }),
};
export type EditName = keyof typeof INPUT;
