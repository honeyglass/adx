/**
 * The entry of '@honeyglass/adx/test', the test kit.
 *
 * Checked, RunOptions, Ran, run: one whole call of a tool in the process of the test, and what
 * it left.
 * fake, reply, Reply: a fake server of a remote, and an answer with a status.
 *
 * @example import { run } from '@honeyglass/adx/test';
 */
export type { Ran } from '../core/index.ts';
export { fake, reply } from '../remote/index.ts';
export type { Reply } from '../remote/index.ts';
export type { Checked, RunOptions } from './run.ts';
export { run } from './run.ts';
