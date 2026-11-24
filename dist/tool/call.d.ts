import type { Around, Ran } from '../core/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export declare function call(shell: Shell, around: Around): Promise<Ran>;
