/**
 * The constants of remote/.
 *
 * RETRIES, PAUSE_MS: how often a read is tried again, and the first pause before it (decision 41).
 * TIMEOUT_MS: how long one request and its answer may take.
 * ANSWER_BYTES: the largest answer adx reads.
 *
 * @example await line.pause(server, PAUSE_MS * 2 ** attempt);
 */

/** Three: a read is tried again up to three times, on a network error, a 429 or a 503. */
export const RETRIES = 3;

/** A fifth of a second; each further pause is twice the one before, 1.4 s in all. */
export const PAUSE_MS = 200;

/** Thirty seconds: a server that takes longer for one answer counts as not reached. */
export const TIMEOUT_MS = 30_000;

/** Sixteen MiB, far beyond the JSON of any one answer, so only a mistake reaches it. */
export const ANSWER_BYTES = 16_777_216;
