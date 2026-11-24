/**
 * The source of a new name: it answers the names already taken, and refuses none of them.
 *
 * fresh, takerOf: the source, and the function that answers the taken names.
 *
 * Whether a name may be written over is the write's to decide, not the source's (decision 10).
 *
 * @example values: { name: fresh(friendNames) },
 */
import { freshBrand } from '../core/index.ts';
import type { Fresh } from '../core/index.ts';

type Maybe<T> = T | Promise<T>;

/** The function as a method, so the one of every typed fresh fits it without a cast. */
type Taker = { taken(input: Readonly<Record<string, unknown>>): Maybe<readonly string[]> };

const takers = new WeakMap<object, Taker>();

class Taking<I> implements Fresh<I> {
  declare readonly [freshBrand]: (input: Partial<I>) => Maybe<string[]>;
}

/** For a new name: answers the names already taken. It refuses nothing. */
export function fresh<I>(taken: (input: Partial<I>) => Maybe<string[]>): Fresh<I> {
  const made = new Taking<I>();
  takers.set(made, { taken });
  return made;
}

/** @returns what answers the taken names of a fresh(), or undefined for any other value */
export const takerOf = (value: object) => takers.get(value);
