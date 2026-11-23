import { code } from '@honeyglass/adx';

// A block move that names no place, or a wrong anchor.
export const nothingToDo = code(
  'NOTHING_TO_DO',
  'fix',
  'Send at least one of "before", "after" or "page"',
);
export const bothAnchors = code('BOTH_ANCHORS', 'fix', 'Send "before" or "after", not both');
export const otherColumn = code(
  'OTHER_COLUMN',
  'fix',
  'Use an anchor of the column the block stands in',
);
// An index past the end of a list.
export const outOfRange = code('INDEX_OUT_OF_RANGE', 'fix', 'Use an index the list has');
