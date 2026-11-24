/**
 * --fields of a list and of a read with `output`: the fields of the answer the caller wants,
 * each whole.
 *
 * namesOf: the names a --fields value holds, and an issue for each the answer does not have.
 * picked: the answer with only those fields, of an object or of each item of an array.
 * pickedItems, itemsOf: the page of a list with each item cut so, and the items of a page.
 *
 * Without --fields a read answers everything, and a list its outline; the names only take
 * away. The fields stand in the order the names give, so the key of an outline comes first.
 *
 * @example const answer = picked(result, ['code', 'formal']);
 */
import { notInList } from "../core/index.js";
/**
 * @param value - the value of --fields, names joined by commas
 * @param fields - the fields of the answer
 * @param call - the words of the command, and the call that lists the fields
 * @returns the names, and a NOT_IN_LIST issue for each name no field has
 */
export function namesOf(value, fields, call) {
    const names = value
        .split(',')
        .map(name => name.trim())
        .filter(name => name !== '');
    const known = new Set(fields.map(field => field.value));
    const issues = names
        .filter(name => known.has(name) === false)
        .map(name => notInList
        .at('fields', `${call.command} answers no field ${name}`)
        .command({ does: 'lists the fields of the answer', command: call.lists }));
    return { names, issues };
}
/** @returns the answer with only the named fields; a value that is no object stays as it is */
export function picked(result, names) {
    if (Array.isArray(result))
        return result.map(item => picked(item, names));
    if (typeof result !== 'object' || result === null)
        return result;
    const kept = Object.entries(result).filter(([key]) => names.includes(key));
    return Object.fromEntries(kept.sort(([a], [b]) => names.indexOf(a) - names.indexOf(b)));
}
/** @returns the page with each item cut to the named fields; a value that is no page stays */
export function pickedItems(listing, names) {
    if (isListing(listing) === false)
        return listing;
    return { ...listing, items: listing.items.map(item => picked(item, names)) };
}
/** @returns the items of a page, or none for a value that is no page */
export const itemsOf = (listing) => (isListing(listing) ? listing.items : []);
const isListing = (value) => typeof value === 'object' && value !== null && 'items' in value && Array.isArray(value.items);
