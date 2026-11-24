/**
 * The terminal form of an answer, for a person at a terminal.
 *
 * textOf: a result as one field on a line, a refusal as its kind, state and issues.
 *
 * The text leaves for the terminal here, so here every control character is escaped, in a
 * message, a path and a result alike: a terminal runs an escape sequence it is sent. Only the line
 * break and the tab stay, since the layout needs them.
 *
 * @example process.stdout.write(textOf(answer));
 */
import type { Answer } from '../core/index.ts';
export declare function textOf(answer: Answer<unknown>): string;
