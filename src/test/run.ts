/**
 * One whole call of a tool in the process of the test, from the arguments to the exit code.
 *
 * Checked, run: what run() takes as the tool, and run() itself.
 *
 * run() and main() go through the same call, so the answer, the text form and the exit code are
 * the program's; only the surroundings come from the options. What a handler writes with
 * console stands before the answer in out and err, as in the program.
 *
 * @example const { exit, out } = await run(hello, ['greet', '--name', 'Ada'], { tty: true });
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { Ran } from '../core/index.ts';
import { captured, tokensOf } from '../node/index.ts';
import { call, specOf } from '../tool/index.ts';

export interface Checked {
  readonly main: () => Promise<void>;
}

/** What run() reads of the surroundings of a call. */
type RunOptions = {
  /** Whether stdout is a terminal: `true` answers text, `false` JSON. Default `false`. */
  tty?: boolean;
};

/**
 * @param tool - the value tool() returned
 * @param argv - the arguments after the program
 * @param options - the surroundings of the call
 * @returns the exit code, and what the call wrote to stdout and stderr
 * @throws a fix RefusalError for a tool that tool() did not make
 */
export async function run(
  tool: Checked,
  argv: readonly string[],
  options: RunOptions = {},
): Promise<Ran> {
  const spec = specOf(tool);
  if (spec === undefined) {
    throw new RefusalError({
      kind: 'fix',
      step: 'run',
      reason: 'the tool was not made by tool() of this adx',
      next: 'pass the value that tool() returned',
    });
  }
  const around = { tokens: tokensOf(argv), tty: options.tty ?? false };
  const { data, out, err } = await captured(() => call(spec, around));
  return { exit: data.exit, out: `${out}${data.out}`, err: `${err}${data.err}` };
}
