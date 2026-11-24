/**
 * The entry of '@honeyglass/adx/test', the test kit.
 *
 * Checked, RunOptions, Ran, run: one whole call of a tool in the process of the test, and what
 * it left.
 * fake, reply, Reply: a fake server of a remote, and an answer with a status.
 * Samples, conformance: what only the test knows of a tool's surroundings, and the check of the
 * whole tool against the Agent DX rules adx builds in.
 *
 * @example import { conformance, run } from '@honeyglass/adx/test';
 */
export type { Ran } from '../core/index.ts';
export { fake, reply } from '../remote/index.ts';
export type { Reply } from '../remote/index.ts';
export { conformance } from './conformance.ts';
export type { Checked, RunOptions, Samples } from './run.ts';
export { run } from './run.ts';
