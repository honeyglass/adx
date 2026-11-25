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
export const LONG_LIST = 50;

/** More bytes than 8 KiB make a large answer. */
export const LARGE_ANSWER = 8192;

/**
 * @param result - the result of the answer
 * @param written - the answer as stdout carries it
 * @returns each limit the answer passes, such as `a list of 60 entries`, none when it is small
 */
export function largeness(result: unknown, written: string) {
  const long = longestList(result);
  const bytes = utf8Length(written);
  return [
    ...(long > LONG_LIST ? [`a list of ${long} entries`] : []),
    ...(bytes > LARGE_ANSWER ? [`${bytes} bytes`] : []),
  ];
}

/** @returns the most entries one array of the value holds, at any depth */
function longestList(value: unknown): number {
  if (Array.isArray(value)) return Math.max(value.length, ...value.map(longestList));
  if (typeof value !== 'object' || value === null) return 0;
  return Math.max(0, ...Object.values(value).map(longestList));
}

// A lone surrogate is written as the three bytes of U+FFFD, as every other code point below 0x10000.
function utf8Length(text: string) {
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0) ?? 0;
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return bytes;
}
