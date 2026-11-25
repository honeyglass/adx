/**
 * The network of the call, as Node's URL parser and its http and https modules give it, on RxJS.
 *
 * network: the port remote/ reaches a server through.
 *
 * A request follows no redirect: a 3xx is answered as it came, so no request goes to an address
 * adx did not build. Nor does it go through a proxy the environment names (decision 22): fetch
 * and Node's own agents take one from HTTP_PROXY once NODE_USE_ENV_PROXY is set, which an agent
 * can set per call, so each request goes through an agent of adx that knows no proxy, and checks
 * every certificate whatever the environment says. It asks for gzip, deflate and br, and reads
 * them decoded, as fetch did. A send is
 * cold: each subscription sends once, and an unsubscribe before the whole answer came aborts the
 * request. The timeout covers the answer too and aborts it the same
 * way, and the body is read up to the limit of the request and no further, so a server that sends
 * without end costs no more than the limit. Every error raised before a whole answer came,
 * whatever its name, such as no connection, a timeout, a server that speaks no HTTP or a broken
 * body, is answered as unreached, with the error whole: the request may have reached the server,
 * and no answer came back.
 *
 * @example const answer = await lastValueFrom(network.send({ url, method: 'GET', headers, timeout, limit }));
 */
import { Agent as HttpAgent, request as httpRequest } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { pipeline } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { $try, trySync$ } from '@honeyglass/utils/ts';
import { catchError, Observable, of, timeout } from 'rxjs';
/**
 * Agents made with no proxy, unlike Node's global ones, which read the environment for one, and
 * one that checks every certificate, which NODE_TLS_REJECT_UNAUTHORIZED cannot switch off.
 */
const HTTP = new HttpAgent();
const HTTPS = new HttpsAgent({ rejectUnauthorized: true });
/** The encodings adx asks for and reads back, as fetch did: each with its decoder. */
const DECODERS = new Map([
    ['gzip', createGunzip],
    ['deflate', createInflate],
    ['br', createBrotliDecompress],
]);
export const network = {
    parse: url => {
        if (URL.canParse(url) === false)
            return undefined;
        const { href, protocol, origin, host, hostname, username, password, pathname, search, hash } = new URL(url);
        return { href, protocol, origin, host, hostname, username, password, pathname, search, hash };
    },
    send,
};
// The timeout unsubscribes, which destroys the request; its error and every other becomes
// unreached.
function send(request) {
    const answer = new Observable(subscriber => {
        const url = new URL(request.url);
        const https = url.protocol === 'https:';
        const length = request.body === undefined ? {} : { 'content-length': `${Buffer.byteLength(request.body)}` };
        const options = {
            method: request.method,
            headers: {
                ...request.headers,
                'accept-encoding': [...DECODERS.keys()].join(', '),
                ...length,
            },
            agent: https ? HTTPS : HTTP,
        };
        const call = https ? httpsRequest : httpRequest;
        const sent = call(url, options, response => void answerTo(subscriber, response, request.limit));
        sent.on('error', error => subscriber.error(error));
        sent.end(request.body);
        return () => sent.destroy();
    });
    return answer.pipe(timeout({ first: request.timeout }), catchError((error) => of({ unreached: error })));
}
// Started with void, so every error of the body goes to the subscriber, whole.
async function answerTo(subscriber, response, limit) {
    const { data, error } = await $try(() => answerOf(response, limit));
    if (error !== null)
        return subscriber.error(error);
    subscriber.next(data);
    subscriber.complete();
}
async function answerOf(response, limit) {
    const headers = Object.fromEntries(Object.entries(response.headers).flatMap(([name, value]) => value === undefined ? [] : [[name, Array.isArray(value) ? value.join(', ') : value]]));
    return { status: response.statusCode ?? 0, headers, body: await bodyOf(response, limit) };
}
// The limit counts the decoded bytes, so a small answer that unpacks without end stops at it.
// Leaving the loop early destroys the stream: nothing more is read. An encoding adx did not ask
// for is read as it came.
async function bodyOf(response, limit) {
    const decode = DECODERS.get(`${response.headers['content-encoding'] ?? ''}`.trim());
    // pipeline destroys the decoder with an error of either stream, so the loop below throws it
    const body = decode === undefined ? response : pipeline(response, decode(), () => { });
    const chunks = [];
    let length = 0;
    for await (const chunk of body) {
        length += chunk.length;
        if (length > limit)
            return { tooLarge: true };
        chunks.push(chunk);
    }
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const text = trySync$(() => decoder.decode(Buffer.concat(chunks)));
    return text.error === null ? { text: text.data } : { utf8: false };
}
