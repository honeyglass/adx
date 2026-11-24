/**
 * The network of the call, as Node's URL parser, fetch and timers give it.
 *
 * network: the port remote/ reaches a server through.
 *
 * A request follows no redirect: a 3xx is answered as it came, so no request goes to an address
 * adx did not build. The timeout covers the answer too, and the body is read up to the limit of
 * the request and no further, so a server that sends without end costs no more than the limit.
 * Every error raised before a whole answer came, whatever its name, such as no connection, a
 * timeout, a server that speaks no HTTP or a broken body, is answered as unreached, with the
 * error whole: the request may have reached the server, and no answer came back.
 *
 * @example const answer = await network.send({ url, method: 'GET', headers, timeout, limit });
 */
import { $try, trySync$ } from '@honeyglass/utils/ts';
export const network = {
    parse: url => {
        if (URL.canParse(url) === false)
            return undefined;
        const { href, protocol, origin, username, password, pathname, search, hash } = new URL(url);
        return { href, protocol, origin, username, password, pathname, search, hash };
    },
    send,
    pause: ms => new Promise(resolve => setTimeout(resolve, ms)),
};
async function send(request) {
    const { data, error } = await $try(() => answerOf(request));
    return error === null ? data : { unreached: error };
}
async function answerOf(request) {
    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.body === undefined ? {} : { body: request.body }),
        redirect: 'manual',
        signal: AbortSignal.timeout(request.timeout),
    });
    const headers = Object.fromEntries(response.headers);
    return { status: response.status, headers, body: await bodyOf(response, request.limit) };
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
