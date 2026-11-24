import type { Changes } from '../core/index.ts';
/**
 * @param before - the text the file holds, or undefined when adx reads no text of it
 * @param after - the text the write puts there, or undefined for bytes that are no UTF-8
 * @param file - the file, which changed as a whole when either side is no text
 * @returns the changes, each list cut to the limit, and how many entries the cut left out
 */
export declare function changesOf(before: string | undefined, after: string | undefined, file: string): Changes;
