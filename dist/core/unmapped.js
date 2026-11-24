/**
 * The issue adx gives an error that nobody mapped, as the guide's "Errors you did not map" says.
 *
 * issueOf: the issue of the first error along the chain that adx knows, else UNKNOWN_ERROR.
 *
 * Each error is known by its properties, not by its class: an HTTP answer by its status and
 * headers, a system error on a path by its syscall, path and code, a network error by its code.
 *
 * @example const issue = issueOf(new TypeError('fetch failed', { cause }));
 */
import { firstIn, isHttpAnswer } from "./cause.js";
import { accessRefused, networkFailed, remoteRefused, serverBusy, systemRefused, unknownError, } from "./codes.js";
/** The statuses a later call may pass: a definition, the guide's row of kind retry. */
const BUSY_STATUSES = new Set([408, 429, 502, 503, 504]);
/** The statuses that refuse access: a definition, the guide's row of ACCESS_REFUSED. */
const ACCESS_STATUSES = new Set([401, 403]);
/**
 * The codes of no connection and of a timeout: a definition, from Node's common system errors
 * and dns codes (nodejs.org/api/errors.html, nodejs.org/api/dns.html), and the connect and
 * timeout errors of undici, which fetch keeps as its cause.
 */
const NETWORK_CODES = new Set([
    'ECONNABORTED',
    'ECONNREFUSED',
    'ECONNRESET',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'ETIMEDOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
]);
/**
 * @param error - any thrown value that is no refusal
 * @param about - what failed, such as the request `GET /apps`, which the message names first
 * @returns the issue of the first known error of its chain, or UNKNOWN_ERROR of kind bug
 */
export function issueOf(error, about) {
    const said = (text) => (about === undefined ? text : `${about}: ${text}`);
    const known = firstIn(error, link => knownIssue(link, said));
    return known ?? unknownError.issue(said('the tool broke on an error it did not expect'));
}
function knownIssue(link, said) {
    if (isHttpAnswer(link))
        return statusIssue(link.status, said);
    if (isPathError(link)) {
        return systemRefused.issue(said(`${link.syscall} of ${link.path} failed with ${link.code}`));
    }
    const network = networkOf(link);
    if (network === undefined)
        return undefined;
    return networkFailed.issue(said(`the server was not reached: ${network}`));
}
function statusIssue(status, said) {
    if (BUSY_STATUSES.has(status))
        return serverBusy.issue(said(`the server answered ${status}`));
    if (ACCESS_STATUSES.has(status)) {
        return accessRefused.issue(said(`the server refused access with ${status}`));
    }
    return remoteRefused.issue(said(`the server answered ${status}`));
}
const isPathError = (link) => isText(link, 'syscall') && isText(link, 'path') && isText(link, 'code');
// A timeout of AbortSignal.timeout() is a DOMException named TimeoutError, with no code.
function networkOf(link) {
    if ('code' in link && typeof link.code === 'string' && NETWORK_CODES.has(link.code)) {
        return link.code;
    }
    if ('name' in link && link.name === 'TimeoutError')
        return 'a timeout';
    return undefined;
}
const isText = (link, key) => typeof Object.getOwnPropertyDescriptor(link, key)?.value === 'string';
