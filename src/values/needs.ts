/**
 * The answer of a source that cannot list its values before other fields are known.
 *
 * needs, neededOf: the answer, and the fields it names.
 *
 * Nothing is checked when needs() is called: a source answers it while a call runs, and adx
 * refuses with one MISSING_VALUE issue per field it names.
 *
 * @example if (project === undefined) return needs('project');
 */
import { needsBrand } from '../core/index.ts';
import type { Needs } from '../core/index.ts';

const neededBy = new WeakMap<object, readonly string[]>();

class Needed<K extends string> implements Needs<K> {
  declare readonly [needsBrand]: K;
}

/**
 * Returned by a source that cannot answer before other fields are known.
 * Name every field that is surely missing at this point; adx refuses with one issue per field.
 */
export function needs<K extends string>(...fields: [K, ...K[]]): Needs<K> {
  const made = new Needed<K>();
  neededBy.set(made, fields);
  return made;
}

/** @returns the fields a needs() names, or undefined for a value it did not make */
export const neededOf = (made: object) => neededBy.get(made);
