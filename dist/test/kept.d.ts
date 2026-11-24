/**
 * The two checks of conformance that read files: the skill, and the fingerprints next to the
 * tool's package.json.
 *
 * skillFindings: whether the named skill exists and is a skill (decisions 7 and 82).
 * storedFindings: whether each stored schema matches the fingerprint checked in for its format
 * number, in adx.stored.json (decisions 21, 37 and 55).
 *
 * The kit reads only the start of the skill: a frontmatter with `name` and `description`. It
 * writes a fingerprint the file does not hold yet, such as on its first run or for a new format,
 * and compares every other one.
 *
 * @example const findings = storedFindings(folder, shell.stored);
 */
import type { Stored } from '../core/index.ts';
/**
 * @param skill - the name the tool gives its skill
 * @param file - the path of its SKILL.md
 * @returns one finding per fact the skill fails, none when it is a skill
 */
export declare function skillFindings(skill: string, file: string): string[];
/** @returns one finding per format whose schema changed under its number */
export declare function storedFindings(folder: string, kinds: readonly Stored<unknown, never>[]): string[];
