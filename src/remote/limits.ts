/**
 * The constants of remote/.
 *
 * RETRIES, PAUSE_MS: how often a read is tried again, and the first pause before it (decision 41).
 * TIMEOUT_MS: how long one request and its answer may take.
 * ANSWER_BYTES: the largest answer adx reads.
 * FAKES_ONLY, LOOPBACK: the variable the test kit sets in a program it runs, and the addresses
 * of the machine itself, which a call under the kit may reach without a fake.
 *
 * @example repeat({ count: RETRIES + 1, delay: count => line.pause(remote, PAUSE_MS * 2 ** (count - 1)) });
 */

/** Three: a read is tried again up to three times, on a network error, a 429 or a 503. */
export const RETRIES = 3;

/** A fifth of a second; each further pause is twice the one before, 1.4 s in all. */
export const PAUSE_MS = 200;

/** Thirty seconds: a server that takes longer for one answer counts as not reached. */
export const TIMEOUT_MS = 30_000;

/** Sixteen MiB, far beyond the JSON of any one answer, so only a mistake reaches it. */
export const ANSWER_BYTES = 16_777_216;

/** Set to 1 by the test kit only; it closes the network of a program, and no value opens it. */
export const FAKES_ONLY = 'ADX_FAKES_ONLY';

/** An origin on the machine itself: 127.0.0.0/8 or [::1], as the WHATWG parser writes it. */
export const LOOPBACK = /^https?:\/\/(?:127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/;
