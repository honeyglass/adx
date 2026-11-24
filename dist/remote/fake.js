const bodies = new WeakMap();
const tables = new WeakMap();
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
 * @param made - the fake of the remote the request goes to
 * @param method - the method of the request
 * @param rel - the path below the address of the remote
 * @returns the answer of its route
 */
export async function fakeAnswer(made, method, rel) {
    const routes = tables.get(made) ?? {};
    const route = `${method} ${rel}`;
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
