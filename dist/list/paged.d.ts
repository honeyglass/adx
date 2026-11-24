import type { Listing, Page } from '../core/index.ts';
/**
 * @param all - every item of the list
 * @param page - the page the call asks for
 * @returns the items of the page, `next` while items follow, and `total`
 * @throws a refusal NOT_IN_LIST at `page` for a cursor paged never names
 */
export declare function paged<T>(all: readonly T[], page: Page): Listing<T>;
