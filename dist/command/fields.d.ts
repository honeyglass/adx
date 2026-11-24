import type { Answered } from './answered.ts';
import type { Choice } from './types.ts';
/**
 * @param value - the value of --fields, names joined by commas
 * @param fields - the fields of the answer
 * @param call - the words of the command, and the call that lists the fields
 * @returns the names, and a NOT_IN_LIST issue for each name no field has
 */
export declare function namesOf(value: string, fields: readonly Choice[], call: {
    command: string;
    lists: string;
}): {
    names: string[];
    issues: import("../core/issue.ts").Issue<"fields">[];
};
/** @returns the answer with only the named fields; a value that is no object stays as it is */
export declare function picked(result: unknown, names: readonly string[]): unknown;
export declare function fieldsListed(fields: readonly Choice[]): Answered;
