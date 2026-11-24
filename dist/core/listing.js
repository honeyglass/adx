/**
 * One page of a list: what a list asks its handler for, and what the handler answers.
 *
 * Page, Listing: the cursor and size of the page asked for, and its items with the next cursor.
 *
 * Both stand in core/, since command/ hands the page to a list and list/ cuts one with paged().
 *
 * @example run: (_, { page }) => paged(LANGUAGES, page),
 */
export {};
