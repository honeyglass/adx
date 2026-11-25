/**
 * The constants of remote/.
 *
 * RETRIES, PAUSE_MS: how often a read is tried again, and the first pause before it (decision 41).
 * TIMEOUT_MS: how long one request and its answer may take.
 * ANSWER_BYTES: the largest answer adx reads.
 * FAKES_ONLY, FAKE_ORIGINS: the variables the test kit sets in a program it runs: the token that
 * closes its network, and the origins of the fakes the kit serves, the only ones it may reach.
 * KIT_ORIGIN: the form of the origin the kit serves a fake at.
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
/**
 * Set by the test kit only, to a token no program can guess. Any value closes the network of a
 * program, and the refusal of a closed request ends with the token, so the kit knows it its own.
 */
export const FAKES_ONLY = 'ADX_FAKES_ONLY';
/** The origins of the fakes the kit serves, joined by commas; a closed program reaches only them. */
export const FAKE_ORIGINS = 'ADX_FAKE_ORIGINS';
/**
 * Plain http to 127.0.0.1 at a port, as node/serve.ts serves each fake: an allow-list by form, so
 * an origin a program names in ADX_FAKE_ORIGINS off the machine is none.
 */
export const KIT_ORIGIN = /^http:\/\/127\.0\.0\.1:\d{1,5}$/;
