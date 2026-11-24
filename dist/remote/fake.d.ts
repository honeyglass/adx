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
export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export interface Reply {
    readonly status: number;
}
export declare function reply(status: number, body?: Json): Reply;
export declare function fake(remote: Remote, routes: Record<string, Json | Reply>): Fake;
/**
 * The test kit sees through it which requests a call sent, such as a POST in a dry run.
 *
 * @param made - a fake a test made
 * @param hear - gets each route the fake answers, such as `POST /tickets`
 * @returns a fake of the same remote that answers from the same routes
 */
export declare function heard(made: Fake, hear: (route: string) => void): Fake;
/**
 * @param made - the fake of the remote the request goes to
 * @param method - the method of the request
 * @param rel - the path below the address of the remote
 * @returns the answer of its route
 */
export declare function fakeAnswer(made: Fake, method: string, rel: string): Promise<Incoming>;
