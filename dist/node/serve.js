/**
 * A server on 127.0.0.1 that answers in place of the server of a remote, for a tool run as a
 * program by the test kit.
 *
 * serve: starts the server on a free port, and answers its address and the way to close it.
 *
 * Each request is answered by the function the test kit gives, from its method and its path as
 * the request encodes it; the query and the body are no part of the route, as for a fake.
 *
 * @example const server = await serve((method, path) => fakeAnswer(made, method, path));
 */
import { once } from 'node:events';
import { createServer } from 'node:http';
import { $try } from '@honeyglass/utils/ts';
/** @returns the address of the server, such as http://127.0.0.1:53211, and its close */
export async function serve(answer) {
    const server = createServer((request, response) => void respond(answer, request, response));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    const close = () => {
        server.close();
        server.closeAllConnections();
    };
    return { url: `http://127.0.0.1:${port}`, close };
}
// Started with void, so it answers every error it did not expect itself, as a 500 for the call.
async function respond(answer, request, response) {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const { data, error } = await $try(() => answer(request.method ?? 'GET', path));
    if (error !== null) {
        response.writeHead(500, { 'content-type': 'text/plain' });
        response.end(`the fake broke: ${error.message}`);
        return;
    }
    response.writeHead(data.status, data.headers);
    response.end('text' in data.body ? data.body.text : '');
}
