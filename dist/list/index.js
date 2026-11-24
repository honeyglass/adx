/**
 * The pages of a list: one page cut out of an array, and the steps adx derives after a page.
 *
 * paged: one page of a whole array, with the cursor of the following one.
 * listSteps, Detail: the following page and the command for one item, after a page.
 * firstPage: the step for a cursor that was refused.
 *
 * @example run: (_, { page }) => paged(LANGUAGES, page),
 */
export { paged } from "./paged.js";
export { firstPage, listSteps } from "./steps.js";
