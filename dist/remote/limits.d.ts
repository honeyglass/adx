/**
 * The constants of remote/.
 *
 * RETRIES, PAUSE_MS: how often a read is tried again, and the first pause before it (decision 41).
 * TIMEOUT_MS: how long one request and its answer may take.
 * ANSWER_BYTES: the largest answer adx reads.
 * FAKES_ONLY, LOOPBACK: the variable the test kit sets in a program it runs, and the addresses
 * of the machine itself, which a call under the kit may reach without a fake.
 *
 * @example await line.pause(server, PAUSE_MS * 2 ** attempt);
 */
/** Three: a read is tried again up to three times, on a network error, a 429 or a 503. */
export declare const RETRIES = 3;
/** A fifth of a second; each further pause is twice the one before, 1.4 s in all. */
export declare const PAUSE_MS = 200;
/** Thirty seconds: a server that takes longer for one answer counts as not reached. */
export declare const TIMEOUT_MS = 30000;
/** Sixteen MiB, far beyond the JSON of any one answer, so only a mistake reaches it. */
export declare const ANSWER_BYTES = 16777216;
/** Set to 1 by the test kit only; it closes the network of a program, and no value opens it. */
export declare const FAKES_ONLY = "ADX_FAKES_ONLY";
/** An origin on the machine itself: 127.0.0.0/8 or [::1], as the WHATWG parser writes it. */
export declare const LOOPBACK: RegExp;
