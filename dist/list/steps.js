/**
 * The steps adx derives around one page of a list: the following page, the first page, and the
 * command for one item.
 *
 * Call, Detail, listSteps: the call that answered, the command that shows one item in full, and
 * the steps after a page, each only where it helps.
 * firstPage: the step for a cursor that was refused.
 *
 * A page step is the same call with the fields --fields named, so each page is cut alike; the
 * following one adds the cursor the answer named. The command for one item carries the fields of
 * the call it has under the same name (decision 52), and needs the field that takes the key. A
 * page whose items do not show the key, as when --fields left it out, names no such command,
 * since the caller has no key to give it.
 *
 * @example const steps = listSteps(answer.result, { target, given, fields, key }, detail);
 */
import { commandStep } from "../core/index.js";
/**
 * @param listing - the page as the call answers it, cut to its outline or to --fields
 * @param call - the list call that answered
 * @param detail - the command that shows one item of the list in full, if the tool has one
 * @returns the step to the following page while `next` names one, then the step to the command
 * for one item while the page holds items that show the key
 */
export function listSteps(listing, call, detail) {
    const next = isRecord(listing) ? listing.next : undefined;
    const items = isRecord(listing) ? listing.items : undefined;
    const page = typeof next === 'string' && next !== '' ? [pageStep(call, next)] : [];
    const keyed = Array.isArray(items) &&
        items.length > 0 &&
        items.every(item => isRecord(item) && call.key !== undefined && Object.hasOwn(item, call.key));
    const one = detail !== undefined && keyed ? [detailStep(detail, call.given)] : [];
    return [...page, ...one];
}
/** @returns the step to the first page: the same call without a cursor */
export const firstPage = (call) => commandStep(call.target, call.given, fieldsOf(call), 'the first page');
function pageStep(call, cursor) {
    const options = [...fieldsOf(call), { option: 'page', value: cursor }];
    return commandStep(call.target, call.given, options, 'the following page');
}
const fieldsOf = (call) => call.fields === undefined ? [] : [{ option: 'fields', value: call.fields.join(',') }];
function detailStep(detail, given) {
    const carried = Object.fromEntries(Object.entries(given).filter(([key]) => key !== detail.field));
    return commandStep(detail.target, carried).needs(detail.field);
}
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
