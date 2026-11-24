/**
 * A fake server of a test: a table of routes that answers in place of the server of a remote.
 *
 * Json, Reply, reply, fake: a JSON value, an answer with a status, and the fake of one remote.
 * fakeAnswer: what a fake answers one request.
 *
 * A route is a method and a path below the address of the remote, such as `GET /apps/shop-web`,
 * each part as the request encodes it; the query is no part of it. A JSON value answers 200, a
 * reply its status and body, and a route the table lacks 404, as a server does for a path it
 * does not know. Nothing is checked when a fake is made: a test makes it before the call runs.
 *
 * @example const busy = fake(api, { [`GET ${project}/tickets`]: reply(503) });
 */
import type { Fake, Incoming, Remote } from '../core/index.ts';
export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export interface Reply {
    readonly status: number;
}
export declare function reply(status: number, body?: Json): Reply;
export declare function fake(remote: Remote, routes: Record<string, Json | Reply>): Fake;
/**
 * @param made - the fake of the remote the request goes to
 * @param method - the method of the request
 * @param rel - the path below the address of the remote
 * @returns the answer of its route
 */
export declare function fakeAnswer(made: Fake, method: string, rel: string): Promise<Incoming>;
