import type { Ran } from '../core/index.ts';
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
export declare function run(tool: Checked, argv: readonly string[], options?: RunOptions): Promise<Ran>;
export {};
