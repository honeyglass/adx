/**
 * A fake server of a test: a table of routes that answers in place of the server of a remote.
 *
 * Json, Reply, reply, fake: a JSON value, an answer with a status, and the fake of one remote.
 * fakeAnswer: what a fake answers one request.
 * heard: a fake that answers as another, and tells the test kit each route it answers.
 *
 * A route is a method and a path below the address of the remote, such as `GET /apps/shop-web`,
 * each part as the request encodes it; the query is no part of it. A JSON value answers 200, a
 * reply its status and body, and a route the table lacks 404, as a server does for a path it
 * does not know. Nothing is checked when a fake is made: a test makes it before the call runs.
 *
 * @example const busy = fake(api, { [`GET ${project}/tickets`]: reply(503) });
 */
import type { Fake, Incoming, Remote } from '../core/index.ts';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface Reply {
  readonly status: number;
}

const bodies = new WeakMap<object, Json | undefined>();
const tables = new WeakMap<Fake, Record<string, Json | Reply>>();
const hearers = new WeakMap<Fake, (route: string) => void>();

export function reply(status: number, body?: Json): Reply {
  const made = { status };
  bodies.set(made, body);
  return made;
}

export function fake(remote: Remote, routes: Record<string, Json | Reply>): Fake {
  const made = { remote };
  tables.set(made, routes);
  return made;
}

/**
 * The test kit sees through it which requests a call sent, such as a POST in a dry run.
 *
 * @param made - a fake a test made
 * @param hear - gets each route the fake answers, such as `POST /tickets`
 * @returns a fake of the same remote that answers from the same routes
 */
export function heard(made: Fake, hear: (route: string) => void): Fake {
  const copy = { remote: made.remote };
  tables.set(copy, tables.get(made) ?? {});
  hearers.set(copy, hear);
  return copy;
}

/**
 * @param made - the fake of the remote the request goes to
 * @param method - the method of the request
 * @param rel - the path below the address of the remote
 * @returns the answer of its route
 */
export async function fakeAnswer(made: Fake, method: string, rel: string): Promise<Incoming> {
  const routes = tables.get(made) ?? {};
  const route = `${method} ${rel}`;
  hearers.get(made)?.(route);
  if (Object.hasOwn(routes, route) === false) return answer(404, { error: `no route ${route}` });
  const value = routes[route];
  if (isReply(value)) return answer(value.status, bodies.get(value));
  return answer(200, value ?? null);
}

const isReply = (value: unknown): value is Reply =>
  typeof value === 'object' && value !== null && bodies.has(value);

const answer = (status: number, body: Json | undefined): Incoming => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: { text: body === undefined ? '' : JSON.stringify(body) },
});
