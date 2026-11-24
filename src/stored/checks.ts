/**
 * The formats of a listed kind, checked at the start of every call.
 *
 * kindIssues: one DECLARATION issue per mistake in the formats of a kind.
 *
 * A file of a number above the current one is newer and refused, so a `.from` above it could
 * never be read, and of two formats with one number only the first ever is. A field `version`
 * in a format would share its key with the format number, so a file could not tell the two apart.
 *
 * @example const issues = shell.stored.flatMap(kindIssues);
 */
import { declaration, keysOf } from '../core/index.ts';
import type { Stored } from '../core/index.ts';
import { formatsOf, isFormatNumber } from './stored.ts';

/**
 * @param kind - a kind the tool lists in `stored`
 * @returns an issue when a number is no whole number from 1, or lies not below the one before,
 * and one per format whose schema has a field `version`
 */
export function kindIssues(kind: Stored<unknown, never>) {
  const formats = formatsOf(kind);
  const versions = formats.map(format => format.version);
  const downward = versions.every((version, i) => fitsAfter(version, versions[i - 1]));
  const numbers = versions.join(', ');
  return [
    ...(downward
      ? []
      : [
          `the stored kind ${kind.name} has the format numbers ${numbers}: each is a whole number from 1, and each .from lies below the one before`,
        ]),
    ...formats
      .filter(format => keysOf(format.shape).includes('version'))
      .map(
        format =>
          `format ${format.version} of the stored kind ${kind.name} has a field version, the key of the format number`,
      ),
  ].map(message => declaration.issue(message));
}

const fitsAfter = (version: number, before: number | undefined) =>
  isFormatNumber(version) && (before === undefined || version < before);
