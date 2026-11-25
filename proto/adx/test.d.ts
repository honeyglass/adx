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
  /**
   * The repository's SKILL.md, relative to the test's working folder. Only the check "agent skill"
   * reads it, for a tool that names a `skill`.
   */
  skillFile?: string;
}
export interface Checked {
  readonly main: () => Promise<void>;
}
/** What `run` takes beside the samples: the three things a call gets from its surroundings. */
export interface RunOptions extends Samples {
  /** The working directory of the call. Without it, a fresh scratch folder. */
  cwd?: string;
  /** The text the call reads from stdin, or `null` when nothing is piped in. Default `null`. */
  stdin?: string | null;
  /** Whether stdout is a terminal: `true` answers text, `false` JSON. Default `false`. */
  tty?: boolean;
}
export interface Ran {
  readonly exit: 0 | 1 | 2;
  /** What the call wrote to stdout. */
  readonly out: string;
  /** What the call wrote to stderr. */
  readonly err: string;
}
/**
 * One call of the tool in the process of the test, from the arguments to the exit code. The data
 * folder is a fresh scratch folder with the seed copied in.
 */
export function run(tool: Checked, argv: readonly string[], options?: RunOptions): Promise<Ran>;
/** One entry: a tool runs in-process, a command line runs as a real program. */
export function conformance(
  t: TestContext,
  target: Checked | readonly string[],
  samples?: Samples,
): Promise<void>;
