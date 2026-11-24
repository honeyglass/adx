import type { Around, Ran } from '../core/index.ts';
import type { ToolSpec } from './tool.ts';
/**
 * @param spec - the spec of the tool
 * @param around - the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export declare function call(spec: ToolSpec, around: Around): Promise<Ran>;
