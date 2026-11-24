/**
 * The constants of node/.
 *
 * PROGRAM_MS: how long one call of a tool as a program may run in the test kit.
 *
 * @example spawn(file, args, { timeout: PROGRAM_MS });
 */

/** Ten seconds, far beyond the tenth of a second one call takes, so only a hang reaches it. */
export const PROGRAM_MS = 10_000;
