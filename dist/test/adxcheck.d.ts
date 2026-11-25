import type { Ran } from '../core/index.ts';
/**
 * @param args - the arguments after the program
 * @param tty - whether stdout is a terminal, so the answer is text
 * @returns the exit code and what adxcheck writes to stdout and stderr; it never rejects
 */
export declare function adxcheck(args: readonly string[], tty: boolean): Promise<Ran>;
