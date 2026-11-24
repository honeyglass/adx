/**
 * The errors of a cause chain, read by property, so any library's error is read the same way.
 *
 * firstIn: the first answer a function gives for an error of the chain.
 * HttpAnswer, isHttpAnswer: the answer of a server, such as a fetch Response, kept as a cause.
 *
 * An HTTP answer has a status and headers. The headers tell it from an error of a child process,
 * whose `status` is an exit code.
 *
 * @example const code = firstIn(error, link => (isHttpAnswer(link) ? link.status : undefined));
 */
import { CHAIN_LIMIT } from "./limits.js";
/**
 * @param error - any thrown value
 * @param pick - an answer for one error of the chain, or undefined to go on to its cause
 * @returns the first answer, or undefined when no error of the chain gives one
 */
export function firstIn(error, pick) {
    return pickIn(error, pick, 0);
}
function pickIn(link, pick, depth) {
    if (depth === CHAIN_LIMIT)
        return undefined;
    if (typeof link !== 'object' || link === null)
        return undefined;
    const picked = pick(link);
    if (picked !== undefined)
        return picked;
    return pickIn('cause' in link ? link.cause : undefined, pick, depth + 1);
}
export const isHttpAnswer = (link) => 'status' in link && isStatus(link.status) && 'headers' in link && isObject(link.headers);
const isStatus = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;
const isObject = (value) => typeof value === 'object' && value !== null;
