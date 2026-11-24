import type { Answer } from '../core/index.ts';
/**
 * @param answer - the answer of the call
 * @param shown - the command's own text of its result, if it has one
 * @returns the text for the terminal, every control character escaped
 */
export declare function textOf(answer: Answer<unknown>, shown?: (result: unknown) => string): string;
/**
 * @param rows - the first column and the second of each row
 * @returns one indented line per row, the first column padded to the longest
 */
export declare function columns(rows: readonly [string, string][]): string;
