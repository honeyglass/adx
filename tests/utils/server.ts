/**
 * A server on 127.0.0.1 that answers from a table of routes, for a proto tool with a remote.
 *
 * Routes, serve: the table, and the server, started for one test and closed after it.
 *
 * A route is a method and a path, such as `GET /apps`; the query is no part of it. A route the
 * table lacks answers 404, as a server does for a path it does not know.
 *
 * @example const url = await serve(t, { 'GET /apps': [] });
 */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TestContext } from 'node:test';

export type Routes = Record<string, unknown>;

/**
 * @param t - the test the server belongs to; it closes after the test
 * @param routes - the JSON body of each route
 * @returns the address of the server, such as http://127.0.0.1:53211
 */
export async function serve(t: TestContext, routes: Routes) {
  const server = createServer((request, response) => answer(routes, request, response));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

function answer(routes: Routes, request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const route = `${request.method} ${path}`;
  const known = Object.hasOwn(routes, route);
  response.writeHead(known ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(known ? routes[route] : { error: `no route ${route}` }));
}
