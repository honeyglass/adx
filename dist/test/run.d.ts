import type { Fake, Ran } from '../core/index.ts';
export interface Checked {
    readonly main: () => Promise<void>;
}
/** What only the test knows of a tool's surroundings, for run() and for conformance. */
export interface Samples {
    /** The fakes that answer in place of the servers of their remotes. */
    fakes?: Fake[];
    /** The variables of the call; none of the process reaches it. */
    env?: Record<string, string>;
    /** A folder of files copied into the data folder of the call. */
    seed?: string;
    /**
     * The repository's SKILL.md, relative to the test's working folder. Only the check "agent skill"
     * reads it, for a tool that names a `skill`.
     */
    skillFile?: string;
}
/** What run() reads of the surroundings of a call. */
export interface RunOptions extends Samples {
    /** The working directory of the call. Without it, a fresh scratch folder. */
    cwd?: string;
    /** The text the call reads from stdin, or `null` when nothing is piped in. Default `null`. */
    stdin?: string | null;
    /** Whether stdout is a terminal: `true` answers text, `false` JSON. Default `false`. */
    tty?: boolean;
}
/**
 * @param tool - the value tool() returned
 * @param argv - the arguments after the program
 * @param options - the surroundings of the call
 * @returns the exit code, and what the call wrote to stdout and stderr
 * @throws a fix RefusalError for a tool that tool() did not make
 */
export declare function run(tool: Checked, argv: readonly string[], options?: RunOptions): Promise<Ran>;
