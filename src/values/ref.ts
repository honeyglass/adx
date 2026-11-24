/**
 * A field that takes a key of a list command: keyOf, and detailOf for the one-item command.
 *
 * keyOf, detailOf, refOf: the two, and the list and role one of them names.
 *
 * Nothing is checked when either is called, since a tool makes its commands when its files load.
 * adx does not check a key against the list, which may be long or lie on a server; it names the
 * list instead.
 *
 * @example values: { id: detailOf(tickets) },
 */
import { refBrand } from '../core/index.ts';
import type { AnyList, ListRef } from '../core/index.ts';

type Role = ListRef[typeof refBrand];

const refs = new WeakMap<object, { list: AnyList; role: Role }>();

class Keyed implements ListRef {
  declare readonly [refBrand]: Role;
}

function made(list: AnyList, role: Role): ListRef {
  const ref = new Keyed();
  refs.set(ref, { list, role });
  return ref;
}

/** The field takes a key of that list. */
export const keyOf = (list: AnyList) => made(list, 'key');

/** The same, and this command is the one that shows one item of the list in full. */
export const detailOf = (list: AnyList) => made(list, 'detail');

/** @returns the list and role of a keyOf() or detailOf(), or undefined for any other value */
export const refOf = (value: object) => refs.get(value);
