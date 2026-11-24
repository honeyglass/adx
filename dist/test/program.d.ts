import type { Caller, Context } from './caller.ts';
import type { Samples } from './run.ts';
/**
 * @param t - the test, which closes the servers of the fakes when it ends
 * @param words - the command line that starts the tool
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a fix RefusalError for a fake whose remote has a fixed address
 */
export declare function programCaller(t: Context, words: readonly string[], samples: Samples): Promise<Caller>;
