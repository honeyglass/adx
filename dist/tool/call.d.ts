import type { Around, Ran } from '../core/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export declare function call(shell: Shell, around: Around): Promise<Ran>;
/**
 * Such an error, a timer that throws or a promise nobody awaits, is a bug whatever it holds, so
 * it never keeps the kind of a RefusalError (decision 88).
 *
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @param error - what the process caught
 * @returns UNKNOWN_ERROR of kind bug, in the form the call answers in, and the error for stderr
 */
export declare function lostAnswer(shell: Shell, around: Around, error: unknown): Ran;
