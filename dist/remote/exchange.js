/**
 * A read and a send of a remote, and the check of every answer against its schema.
 *
 * read: what `get` answers: tried again on a network error, a 429 or a 503 (decision 41), with a
 * status of `on` answered by its value; the tries run on RxJS (decision 83).
 * act: the send of `apply`, never tried again, counted on the line of the call.
 *
 * While adx answers a refusal no request goes out (decision 79): a read or a send then throws
 * Held, and the source that asked for it cannot tell its answer. A request that got no whole
 * answer is NETWORK_FAILED, whatever the network raised, with that error whole as its cause. A
 * status outside 2xx keeps the answer of the server as its cause, so status() reads it, and the
 * guide's table of unmapped errors, in unmapped.ts, picks the code; an answer of 2xx that adx
 * cannot read keeps no status, so status() reads no success for a failure.
 *
 * @example const ticket = await read(api, ['tickets', id], Ticket, { on: { 404: undefined } });
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { last, lastValueFrom, repeat, takeWhile } from 'rxjs';
import { declaration, factsOf, Held, isRefusing, issueOf, networkFailed, NOTHING_CHANGED, refusedWith, remoteRefused, UNKNOWN_STATE, } from "../core/index.js";
import { lineNow } from "./line.js";
import { PAUSE_MS, RETRIES } from "./limits.js";
/** The statuses a read is tried again on; the guide's busy row holds more, but only these wait. */
const AGAIN = new Set([429, 503]);
const NETWORK_FAILED = factsOf(networkFailed).code;
const requests = new WeakMap();
/**
 * @param method - the method of the request
 * @param parts - the remote that sends it, the path and the body
 * @returns the request, which only act.send sends
 */
export function request(method, parts) {
    const made = { method };
    requests.set(made, parts);
    return made;
}
/**
 * @param remote - the remote that reads
 * @param path - the parts of the path
 * @param answer - the schema of the answer
 * @param options - the query, and a value for each status that is no failure here
 * @returns the checked answer, or the value of a status `on` names
 * @throws a refusal of the request, kind by the guide's table, after the last try
 */
export async function read(remote, path, answer, options) {
    const line = lineReady();
    const target = line.target(remote, 'GET', path, { query: options.query });
    const { on } = options;
    const incoming = await lastValueFrom(tried(line, target, on));
    if ('unreached' in incoming)
        throw unreached(incoming, target.what);
    const status = incoming.status;
    if (on !== undefined && isKey(on, status))
        return valueAt(on, status);
    if (isOk(incoming.status))
        return checked(incoming, answer, target.what);
    throw refused(issueOf(incoming, target.what), incoming);
}
/**
 * The first answer that is not busy, or the last one, after RETRIES more tries.
 *
 * Each try subscribes to the request again, after a pause twice the one before. A status that
 * `on` names is an answer, even 429 or 503.
 */
function tried(line, target, on) {
    const pause = (count) => line.pause(target.remote, PAUSE_MS * 2 ** (count - 1));
    return line.exchange(target).pipe(repeat({ count: RETRIES + 1, delay: pause }), takeWhile(incoming => isBusy(incoming, on), true), last());
}
function isBusy(incoming, on) {
    if ('unreached' in incoming)
        return true;
    if (on !== undefined && isKey(on, incoming.status))
        return false;
    return AGAIN.has(incoming.status);
}
export const act = { send };
/**
 * A send that went out and got no answer may have taken effect, so it is never tried again.
 *
 * @param label - how the state of a refusal names the request
 * @param made - the request, from post, put, patch or delete
 * @param answer - the schema of the answer
 * @returns the checked answer
 * @throws a refusal of the request, kind by the guide's table
 */
async function send(label, made, answer) {
    const line = lineReady();
    const parts = requests.get(made);
    if (parts === undefined) {
        const issue = declaration.issue('act.send got a request that no remote made');
        throw refusedWith([issue], UNKNOWN_STATE);
    }
    const body = parts.body === undefined ? {} : { body: JSON.stringify(parts.body) };
    const target = line.target(parts.remote, made.method, parts.path, body);
    const sent = line.sending(label);
    const incoming = await lastValueFrom(line.exchange(target));
    if ('unreached' in incoming)
        throw unreached(incoming, target.what);
    if (isOk(incoming.status) === false) {
        sent.outcome = 'refused';
        throw refused(issueOf(incoming, target.what), incoming);
    }
    sent.outcome = 'answered';
    return checked(incoming, answer, target.what);
}
function lineReady() {
    const line = lineNow();
    if (isRefusing())
        throw new Held();
    return line;
}
// An empty body is no value, as for a 204; the server's other fields are dropped, as Zod does.
function checked({ body }, answer, what) {
    if ('tooLarge' in body)
        throw refused(remoteRefused.issue(`${what} answered too much`));
    if ('utf8' in body)
        throw refused(remoteRefused.issue(`${what} answered no UTF-8 text`));
    const json = trySync$(() => (body.text === '' ? undefined : JSON.parse(body.text)));
    if (json.error !== null) {
        throw refused(remoteRefused.issue(`${what} answered no JSON`), json.error);
    }
    const parsed = answer.safeParse(json.data);
    if (parsed.success)
        return parsed.data;
    const problems = parsed.error.issues
        .map(issue => `${issue.path.join('.') || 'the answer'}: ${issue.message}`)
        .join('; ');
    const message = `${what} answered what its schema does not take, ${problems}`;
    throw refused(remoteRefused.issue(message), parsed.error);
}
// A known cause names itself, such as ECONNREFUSED; any other still got no whole answer.
function unreached({ unreached: error }, what) {
    const known = issueOf(error, what);
    const issue = known.code === NETWORK_FAILED ? known : networkFailed.issue(`${what}: no whole answer came`);
    return refused(issue, error);
}
const isOk = (status) => status >= 200 && status <= 299;
const valueAt = (on, key) => on[key];
const isKey = (on, status) => Object.hasOwn(on, status);
// A failed request changed nothing the call knows of; after a send, the tool names the sends.
const refused = (issue, cause) => refusedWith([issue], NOTHING_CHANGED, cause);
