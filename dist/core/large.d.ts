/**
 * When an answer is a long list or a large document (decision 56), as adx and its kit judge it.
 *
 * LONG_LIST, LARGE_ANSWER: the two limits.
 * largeness: what of the two an answer is, in words, so adx refuses a read without `output` that
 * gives it (decision 91), and the kit's probe "large answers" names the same.
 *
 * The bytes are those of the text as written, counted in UTF-8 here, so core needs no module of
 * Node and both judges count alike.
 *
 * @example const said = largeness(result, `${JSON.stringify({ ok: true, result })}\n`);
 */
/** More entries than fifty in one array of an answer make a long list. */
export declare const LONG_LIST = 50;
/** More bytes than 8 KiB make a large answer. */
export declare const LARGE_ANSWER = 8192;
/**
 * @param result - the result of the answer
 * @param written - the answer as stdout carries it
 * @returns each limit the answer passes, such as `a list of 60 entries`, none when it is small
 */
export declare function largeness(result: unknown, written: string): string[];
