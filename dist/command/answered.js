/**
 * What a command answers a call: the answer, and the terminal form of its result.
 *
 * Answered: the answer, the text a person at a terminal reads in place of the result, and what
 * the steps after a success read.
 * refused: the answer of adx's own issues, which stop a call before it changed anything.
 *
 * The text stays a function, so a call through a pipe never runs the author's `text`.
 *
 * @example if (issues.length > 0) return refused(issues);
 */
import { NOTHING_CHANGED, refusalAnswer, refusedWith } from "../core/index.js";
/** @param issues - adx's own issues of one call, at least one */
export function refused(issues) {
    return { answer: refusalAnswer(refusedWith(issues, NOTHING_CHANGED)) };
}
