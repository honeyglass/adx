// Type-only prototype of @honeyglass/adx/test of adx v2.
import type { TestContext } from 'node:test';
import type { Fake, Remote } from './index.js';
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Reply {
  readonly status: number;
}
export function reply(status: number, body?: Json): Reply;
export function fake(remote: Remote, routes: Record<string, Json | Reply>): Fake;
export interface Samples {
  fakes?: Fake[];
  env?: Record<string, string>;
  seed?: string;
}
export interface Checked {
  readonly main: () => Promise<void>;
}
/** One entry: a tool runs in-process, a command line runs as a real program. */
export function conformance(
  t: TestContext,
  target: Checked | readonly string[],
  samples?: Samples,
): Promise<void>;
