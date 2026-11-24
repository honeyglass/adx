/**
 * --fields of a read with `output`: the fields of the answer the caller wants, each whole.
 *
 * namesOf: the names a --fields value holds, and an issue for each the answer does not have.
 * picked: the answer with only those fields, of an object or of each item of a list.
 * fieldsListed: the answer of --fields alone, which lists the fields.
 *
 * Without --fields the read answers everything; the names only take away.
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
    return Object.fromEntries(Object.entries(result).filter(([key]) => names.includes(key)));
}
export function fieldsListed(fields) {
    return {
        answer: { ok: true, result: { option: 'fields', values: fields } },
        text: () => `option  fields\nvalues  ${fields.map(field => field.value).join(', ')}\n`,
    };
}
