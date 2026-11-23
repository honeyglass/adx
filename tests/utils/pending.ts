/**
 * An e2e test of a journey that a later package of the build turns green.
 *
 * pending: the test, a todo while the journey fails, and a failure once it passes.
 *
 * A todo that fails leaves the run green, so nothing would make the package that turns the
 * journey green also remove its todo. pending fails the run as soon as the journey passes.
 *
 * @example pending('P1', 'greets Ada in one JSON document', async t => { ... });
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { $try } from '@honeyglass/utils/ts';

/**
 * @param until - the package that turns the journey green, such as P1
 * @param name - the name of the test, which states the journey
 * @param journey - the steps and assertions, as the body of a plain test
 */
export function pending(until: string, name: string, journey: (t: TestContext) => Promise<void>) {
  test(name, async t => {
    const { error } = await $try(() => journey(t));
    if (error === null) assert.fail(`passes now: make it a plain test(), not pending('${until}')`);
    t.todo(`green with ${until}: ${error.message.split('\n')[0]}`);
  });
}
