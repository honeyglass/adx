import type { Issue } from '../core/index.ts';
import type { Caller, Cleanup } from './caller.ts';
import type { Samples } from './run.ts';
/**
 * @param t - what closes the servers of the fakes when the check ends
 * @param words - the command line that starts the tool
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a refusal URL_NOT_ALLOWED for a fake whose remote has a fixed address, and SCHEMA at
 * `env` for a variable of the samples the kit sets itself
 */
export declare function programCaller(t: Cleanup, words: readonly string[], samples: Samples): Promise<Caller>;
/**
 * @param env - the variables of the samples
 * @param more - the variables the kit sets for this tool, such as those of its roots
 * @returns one SCHEMA issue at `env` per variable the kit sets itself
 */
export declare function kitVariableIssues(env: Readonly<Record<string, string>>, more?: readonly string[]): Issue<string>[];
