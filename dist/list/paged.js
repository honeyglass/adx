/**
 * One page cut out of a whole array, for a list whose handler holds all its items.
 *
 * paged: the items of the page, the cursor of the following one, and the count of all.
 *
 * The cursor paged names is the offset of the following page as a decimal number, and the first
 * page has the empty cursor. A cursor that is no such number is refused, never read as the first
 * page. paged cannot tell an offset another list named from one of its own, so such a cursor
 * passes. A cursor past the end answers an empty page, since a list can shrink between two calls.
 *
 * @example run: (_, { page }) => paged(LANGUAGES, page),
 */
import { NOTHING_CHANGED, notInList, refusedWith } from "../core/index.js";
/** An allow-list: the offsets paged names, a decimal number without a sign or a leading zero. */
const OFFSET = /^[1-9][0-9]*$/;
/**
 * @param all - every item of the list
 * @param page - the page the call asks for
 * @returns the items of the page, `next` while items follow, and `total`
 * @throws a refusal NOT_IN_LIST at `page` for a cursor paged never names
 */
export function paged(all, page) {
    const start = offsetOf(page.cursor);
    const end = start + page.size;
    const next = end < all.length ? { next: `${end}` } : {};
    return { items: all.slice(start, end), ...next, total: all.length };
}
function offsetOf(cursor) {
    if (cursor === '')
        return 0;
    if (OFFSET.test(cursor))
        return Number(cursor);
    const message = `${JSON.stringify(cursor)} is no page this list names`;
    throw refusedWith([notInList.at('page', message)], NOTHING_CHANGED);
}
