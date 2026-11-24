const bodies = new WeakMap();
const tables = new WeakMap();
const hearers = new WeakMap();
export function reply(status, body) {
    const made = { status };
    bodies.set(made, body);
    return made;
}
export function fake(remote, routes) {
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
export function heard(made, hear) {
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
export async function fakeAnswer(made, method, rel) {
    const routes = tables.get(made) ?? {};
    const route = `${method} ${rel}`;
    hearers.get(made)?.(route);
    if (Object.hasOwn(routes, route) === false)
        return answer(404, { error: `no route ${route}` });
    const value = routes[route];
    if (isReply(value))
        return answer(value.status, bodies.get(value));
    return answer(200, value ?? null);
}
const isReply = (value) => typeof value === 'object' && value !== null && bodies.has(value);
const answer = (status, body) => ({
    status,
    headers: { 'content-type': 'application/json' },
    body: { text: body === undefined ? '' : JSON.stringify(body) },
});
