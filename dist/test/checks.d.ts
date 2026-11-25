import type { Cleanup } from './caller.ts';
import type { Outcome } from './rules.ts';
import type { Checked, Samples } from './run.ts';
export type Check = {
    name: string;
    outcome: () => Promise<Outcome>;
};
/**
 * @param t - what closes the servers of the fakes when the check ends, such as the test
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @returns the checks in the order they run; each probe calls only when its outcome is asked
 * @throws a fix RefusalError when the target cannot be probed
 */
export declare function checksOf(t: Cleanup, target: Checked | readonly string[], samples: Samples): Promise<Check[]>;
