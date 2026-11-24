/**
 * What a replace changes: JSON paths when both contents are JSON, else the lines added and removed.
 *
 * changesOf: the changes from the old bytes to the new ones, at most CHANGES_LIMIT per list.
 *
 * A path joins its keys and indexes with dots, as an issue does, such as `langs.1`. A key on one
 * side only is added or removed whole; a value both sides hold, of another kind or value, is
 * changed. Lines count as many times as they stand, so a second equal line is added too. Text
 * changes have no `changed`: a line is added or removed. A file of bytes that are no text, or
 * one too large to read, changed as a whole: its name stands in `changed`.
 *
 * @example const changes = changesOf('{"lang":"de"}', '{"lang":"en"}', 'ada.json');
 */
import { trySync$ } from '@honeyglass/utils/ts';
import type { Changes } from '../core/index.ts';
import { CHANGES_LIMIT } from './limits.ts';

type Lists = { added: string[]; changed: string[]; removed: string[] };

/**
 * @param before - the text the file holds, or undefined when adx reads no text of it
 * @param after - the text the write puts there, or undefined for bytes that are no UTF-8
 * @param file - the file, which changed as a whole when either side is no text
 * @returns the changes, each list cut to the limit, and how many entries the cut left out
 */
export function changesOf(
  before: string | undefined,
  after: string | undefined,
  file: string,
): Changes {
  const lists: Lists = { added: [], changed: [], removed: [] };
  if (before === undefined || after === undefined) return cut({ ...lists, changed: [file] });
  const oldJson = trySync$((): unknown => JSON.parse(before));
  const newJson = trySync$((): unknown => JSON.parse(after));
  if (oldJson.error === null && newJson.error === null) {
    jsonChanges(oldJson.data, newJson.data, [], lists);
  } else {
    lineChanges(before.split('\n'), after.split('\n'), lists);
  }
  return cut(lists);
}

function jsonChanges(old: unknown, next: unknown, path: string[], lists: Lists) {
  if (isContainer(old) && isContainer(next) && Array.isArray(old) === Array.isArray(next)) {
    const keys = [...new Set([...Object.keys(old), ...Object.keys(next)])];
    for (const key of keys) {
      const at = [...path, key];
      if (Object.hasOwn(old, key) === false) lists.added.push(at.join('.'));
      else if (Object.hasOwn(next, key) === false) lists.removed.push(at.join('.'));
      else jsonChanges(Reflect.get(old, key), Reflect.get(next, key), at, lists);
    }
    return;
  }
  if (isContainer(old) || isContainer(next) || old !== next) lists.changed.push(path.join('.'));
}

function lineChanges(old: readonly string[], next: readonly string[], lists: Lists) {
  lists.added.push(...beyond(next, old));
  lists.removed.push(...beyond(old, next));
}

// The lines of one side that the other holds fewer times, in their order.
function beyond(lines: readonly string[], other: readonly string[]) {
  const left = new Map<string, number>();
  for (const line of other) left.set(line, (left.get(line) ?? 0) + 1);
  return lines.filter(line => {
    const count = left.get(line) ?? 0;
    left.set(line, count - 1);
    return count <= 0;
  });
}

function cut({ added, changed, removed }: Lists): Changes {
  const more = [added, changed, removed].reduce(
    (sum, list) => sum + Math.max(0, list.length - CHANGES_LIMIT),
    0,
  );
  const first = (list: string[]) => list.slice(0, CHANGES_LIMIT);
  return { added: first(added), changed: first(changed), removed: first(removed), more };
}

const isContainer = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;
