/**
 * The source of a new name: it answers the names already taken, and refuses none of them.
 *
 * fresh, takerOf: the source, and the function that answers the taken names.
 *
 * Whether a name may be written over is the write's to decide, not the source's (decision 10).
 *
 * @example values: { name: fresh(friendNames) },
 */
import { freshBrand } from "../core/index.js";
const takers = new WeakMap();
class Taking {
}
/** For a new name: answers the names already taken. It refuses nothing. */
export function fresh(taken) {
    const made = new Taking();
    takers.set(made, { taken });
    return made;
}
/** @returns what answers the taken names of a fresh(), or undefined for any other value */
export const takerOf = (value) => takers.get(value);
