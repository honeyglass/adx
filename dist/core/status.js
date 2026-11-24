/**
 * The HTTP status of a failed send, for an author who maps a status of a send himself.
 *
 * status: the status of the first HTTP answer along the error and its causes.
 *
 * Only an HTTP answer counts, such as a fetch Response that a refusal of adx keeps as cause; an
 * error of a child process has a `status` too, its exit code, and gives none.
 *
 * @example if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
 */
import { firstIn, isHttpAnswer } from "./cause.js";
/**
 * @param error - any thrown value
 * @returns the status from 100 to 599, or undefined when no error of the chain is an HTTP answer
 */
export function status(error) {
    return firstIn(error, link => (isHttpAnswer(link) ? link.status : undefined));
}
