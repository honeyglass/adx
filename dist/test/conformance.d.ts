import type { TestContext } from '../node/index.ts';
import type { Checked, Samples } from './run.ts';
/**
 * @param t - the test, whose subtests the checks are
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @throws a fix RefusalError when the target cannot be probed, and per check in its subtest
 */
export declare function conformance(t: TestContext, target: Checked | readonly string[], samples?: Samples): Promise<void>;
