/**
 * The test kit's check of a whole tool: every check of the Agent DX rules adx builds in, as one
 * subtest each of the test that calls it.
 *
 * conformance: probes a tool in the process of the test, or a command line as a real program.
 *
 * What each check probes stands in checks.ts. A check that failed throws in its subtest, and
 * one that could not run in full is a todo there.
 *
 * @example test('hello keeps the agent rules', t => conformance(t, hello, samples));
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { TestContext } from '../node/index.ts';
import type { Context } from './caller.ts';
import { checksOf } from './checks.ts';
import type { Outcome } from './rules.ts';
import type { Checked, Samples } from './run.ts';

/**
 * @param t - the test, whose subtests the checks are
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @throws a fix RefusalError when the target cannot be probed, and per check in its subtest
 */
export async function conformance(
  t: TestContext,
  target: Checked | readonly string[],
  samples: Samples = {},
) {
  // the test of node:test, through the members conformance uses, so only node/ names Node's own
  const context: Context = t;
  for (const check of await checksOf(context, target, samples)) {
    await context.test(check.name, async sub => {
      const { failed, todo } = await check.outcome();
      if (failed !== undefined) failedOn(failed);
      if (todo !== undefined) sub.todo(todo);
    });
  }
}

// A probe fails by its calls, a file check by the file it read, so each brings its own reason.
function failedOn({ next, reason, findings }: NonNullable<Outcome['failed']>) {
  throw new RefusalError({
    kind: 'fix',
    step: 'conformance',
    reason,
    next,
    cause: findings.join('\n'),
  });
}
