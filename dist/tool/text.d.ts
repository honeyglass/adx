/**
 * The terminal form of an answer, for a person at a terminal.
 *
 * textOf: a result as one field on a line or as the command's own text, whether an effect
 * applied, the next steps below it, and a refusal as its kind, state and issues.
 * columns: rows of two columns, the first padded, as the start answer and the steps show them.
 *
 * The text leaves for the terminal here, so here every control character is escaped, in a
 * message, a path and a result alike: a terminal runs an escape sequence it is sent. Only the line
 * break and the tab stay, since the layout needs them.
 *
 * @example process.stdout.write(textOf(answer));
 */
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
