import type { Step, Target } from '../core/index.ts';
/**
 * `given` is the input as a step carries it; `fields` the names --fields gave, if any; `key` the
 * field that names an item.
 */
export type Call = {
    target: Target;
    given: Readonly<Record<string, unknown>>;
    fields: readonly string[] | undefined;
    key: string | undefined;
};
/** The command whose field takes a key of the list with detailOf, and that field. */
export type Detail = {
    target: Target;
    field: string;
};
/**
 * @param listing - the page as the call answers it, cut to its outline or to --fields
 * @param call - the list call that answered
 * @param detail - the command that shows one item of the list in full, if the tool has one
 * @returns the step to the following page while `next` names one, then the step to the command
 * for one item while the page holds items that show the key
 */
export declare function listSteps(listing: unknown, call: Call, detail: Detail | undefined): Step[];
/** @returns the step to the first page: the same call without a cursor */
export declare const firstPage: (call: Call) => import("../core/step.ts").CommandStep<unknown, string, never>;
