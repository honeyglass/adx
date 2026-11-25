/**
 * A token no program can guess, from Node's random source.
 *
 * nonce: a fresh one per call.
 *
 * @example const token = nonce();
 */
import { randomUUID } from 'node:crypto';

export const nonce = () => randomUUID();
