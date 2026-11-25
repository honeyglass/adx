/**
 * The check of conformance that reads and keeps the fingerprints next to the tool's package.json.
 *
 * storedFindings: whether each stored schema matches the fingerprint checked in for its format
 * number, in adx.stored.json (decisions 21, 37 and 55).
 *
 * The kit writes a fingerprint the file does not hold yet, such as on its first run or for a new format,
 * and compares every other one.
 *
 * @example const findings = storedFindings(folder, shell.stored);
 */
import type { Stored } from '../core/index.ts';
import { digestOf, keep, textAt } from '../node/index.ts';
import { bareSchemaOf } from '../shapes/index.ts';
import { formatsOf } from '../stored/index.ts';
import { fingerprintsIn } from './answer.schema.ts';
import { STORED_FILE, STORED_FILE_BYTES } from './limits.ts';

/** @returns one finding per format whose schema changed under its number */
export function storedFindings(folder: string, kinds: readonly Stored<unknown, never>[]) {
  const path = `${folder}/${STORED_FILE}`;
  const before = textAt(path, STORED_FILE_BYTES);
  const kept = fingerprintsIn(before);
  const prints = kinds.map(kind => ({ kind, now: fingerprintsOf(kind) }));
  const findings = prints.flatMap(({ kind, now }) =>
    Object.entries(now)
      .filter(([version, print]) => (kept[kind.name]?.[version] ?? print) !== print)
      .map(([version]) => changed(kind, Number(version))),
  );
  const all = {
    ...kept,
    ...Object.fromEntries(
      prints.map(({ kind, now }) => [kind.name, { ...now, ...kept[kind.name] }]),
    ),
  };
  const after = `${JSON.stringify(all, null, 2)}\n`;
  if (findings.length === 0 && after !== before) keep(path, after);
  return findings;
}

const fingerprintsOf = (kind: Stored<unknown, never>) =>
  Object.fromEntries(
    formatsOf(kind).map(({ version, shape }) => [
      `${version}`,
      digestOf(JSON.stringify(bareSchemaOf(shape))),
    ]),
  );

function changed(kind: Stored<unknown, never>, version: number) {
  if (version !== kind.version)
    return `${kind.name}: the schema of format ${version} changed, and files of format ${version} still hold the old one. Put it back.`;
  return `${kind.name}: the schema changed, but its version is still ${version}.\nRaise it to ${version + 1} and add .from(${version}, ...) for the old files.`;
}
