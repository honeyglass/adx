/**
 * The network of the call, as Node's URL parser and fetch give it, on RxJS.
 *
 * network: the port remote/ reaches a server through.
 *
 * A request follows no redirect: a 3xx is answered as it came, so no request goes to an address
 * adx did not build. A send is cold: each subscription sends once, and an unsubscribe before the
 * whole answer came aborts the request. The timeout covers the answer too and aborts it the same
 * way, and the body is read up to the limit of the request and no further, so a server that sends
 * without end costs no more than the limit. Every error raised before a whole answer came,
 * whatever its name, such as no connection, a timeout, a server that speaks no HTTP or a broken
 * body, is answered as unreached, with the error whole: the request may have reached the server,
 * and no answer came back.
 *
 * @example const answer = await lastValueFrom(network.send({ url, method: 'GET', headers, timeout, limit }));
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { catchError, of, timeout } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
export const network = {
    parse: url => {
        if (URL.canParse(url) === false)
            return undefined;
        const { href, protocol, origin, hostname, username, password, pathname, search, hash } = new URL(url);
        return { href, protocol, origin, hostname, username, password, pathname, search, hash };
    },
    send,
};
// The timeout unsubscribes, which aborts the fetch; its error and every other becomes unreached.
function send(request) {
    const answer = fromFetch(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.body === undefined ? {} : { body: request.body }),
        redirect: 'manual',
        selector: response => answerOf(response, request.limit),
    });
    return answer.pipe(timeout({ first: request.timeout }), catchError((error) => of({ unreached: error })));
}
async function answerOf(response, limit) {
    const headers = Object.fromEntries(response.headers);
    return { status: response.status, headers, body: await bodyOf(response, limit) };
}
// Leaving the loop early cancels the stream: nothing more is read.
async function bodyOf(response, limit) {
    if (response.body === null)
        return { text: '' };
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
        length += chunk.length;
        if (length > limit)
            return { tooLarge: true };
        chunks.push(chunk);
    }
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const text = trySync$(() => decoder.decode(Buffer.concat(chunks)));
    return text.error === null ? { text: text.data } : { utf8: false };
}
