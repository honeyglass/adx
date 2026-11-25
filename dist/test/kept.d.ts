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
/** @returns one finding per format whose schema changed under its number */
export declare function storedFindings(folder: string, kinds: readonly Stored<unknown, never>[]): string[];
