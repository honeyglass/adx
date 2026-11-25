/**
 * Where a request of a remote goes, and the token it carries: the one place a request is let out.
 *
 * envUrl, bearer: the address from a variable with a fallback, and the token from a variable.
 * Server, made, serverOf: what a remote is, as adx reads it.
 * addressOf, tokenOf, ready: the address of one request, the token of its server, and both
 * checked before a call writes a file.
 * setupIssuesOf: what the tool declared of a remote that no call can fix, checked at every start.
 * variablesOf: the variables a remote reads, which `schema` names, never their values.
 * urlVariableOf: the variable that moves the address of a remote, so the test kit points a
 * program at its fake.
 *
 * Nothing is read when a remote is made: its file loads before any call, and each call has its
 * own variables. So envUrl answers a text that stands for the variable, and the call reads it.
 * An address is let out only when its scheme is http or https and it holds no user, query or
 * fragment. A request goes out only when the WHATWG parser, the one fetch reads with, reads its
 * address back as adx built it, so each value stays one part of the path or the query, and none
 * leaves the address of the server. A value that is no well-formed text, such as a lone
 * surrogate, has no encoding, so it is refused there too. A token is a header, so it holds
 * visible ASCII only, and it goes over https, or over plain http only to the machine itself
 * (decision 22): anyone on the way reads plain http.
 *
 * @example const { url, rel } = addressOf(server, env, network, ['tickets', id], {});
 */
import {
  declaration,
  envMissing,
  NOTHING_CHANGED,
  refusedWith,
  urlNotAllowed,
} from '../core/index.ts';
import type { Address, Auth, Issue, Network, Remote } from '../core/index.ts';

type Env = Readonly<Record<string, string | undefined>>;
type Query = Readonly<Record<string, string | number | undefined>>;

export type Server = { name: string; url: string; auth: Auth | undefined };

/** The schemes adx sends to: an allow-list, which only the person widens. */
const SCHEMES = new Set(['http:', 'https:']);

/**
 * The hosts of the machine itself, as the WHATWG parser writes them: an allow-list by exact
 * host, so `127.0.0.1.example.com` is none, and only the person widens it.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Visible ASCII, what a header value may hold (RFC 9110, field-vchar without obs-text). */
const TOKEN = /^[\x21-\x7e]+$/;

const envUrls = new Map<string, { variable: string; fallback: string }>();
const tokens = new WeakMap<Auth, string>();
const servers = new WeakMap<Remote, Server>();

export function envUrl(variable: string, fallback: string): string {
  const text = `$${variable}, else ${fallback}`;
  envUrls.set(text, { variable, fallback });
  return text;
}

export function bearer(variable: string): Auth {
  const auth = {};
  tokens.set(auth, variable);
  return auth;
}

/** Keeps what a remote is beside it, so the remote has the members its declaration names. */
export const made = (remote: Remote, server: Server) => void servers.set(remote, server);

export const serverOf = (remote: Remote) => servers.get(remote);

/** @returns each variable of the remote, with what it holds */
export function variablesOf(remote: Remote) {
  const server = servers.get(remote);
  if (server === undefined) return [];
  const url = envUrls.get(server.url);
  const token = server.auth === undefined ? undefined : tokens.get(server.auth);
  return [
    ...(url === undefined
      ? []
      : [{ variable: url.variable, does: `the address of ${server.name}` }]),
    ...(token === undefined ? [] : [{ variable: token, does: `the token for ${server.name}` }]),
  ];
}

/** @returns the name the tool gave the remote, or undefined for a value remote() did not make */
export const nameOf = (remote: Remote) => servers.get(remote)?.name;

/** @returns the variable of envUrl() the remote reads its address from, or undefined */
export function urlVariableOf(remote: Remote) {
  const server = servers.get(remote);
  return server === undefined ? undefined : envUrls.get(server.url)?.variable;
}

/**
 * @param server - the remote that sends
 * @param env - the variables of the call
 * @param network - the parser of the call, the one its requests go through
 * @param path - the parts of the path below the address of the server
 * @param query - the query; an undefined value is left out
 * @returns the address, and the path below the server, as a fake matches it
 * @throws a refusal URL_NOT_ALLOWED for an address adx does not send to, DECLARATION for a
 * fallback or a fixed address of the tool that is none
 */
export function addressOf(
  server: Server,
  env: Env,
  network: Network,
  path: readonly (string | number)[],
  query: Query,
) {
  const base = baseOf(server, env, network);
  const parts = path.map(part => `${part}`);
  const values = Object.entries(query).flatMap(([key, value]) =>
    value === undefined ? [] : [key, `${value}`],
  );
  if ([...parts, ...values].some(text => text.isWellFormed() === false)) {
    throw refused(urlNotAllowed.issue('a part of the path or the query is no well-formed text'));
  }
  const rel = parts.map(part => `/${encodeURIComponent(part)}`).join('');
  const pairs = Object.entries(query).flatMap(([key, value]) =>
    value === undefined ? [] : [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`],
  );
  const search = pairs.length === 0 ? '' : `?${pairs.join('&')}`;
  const pathname = `${base.pathname.replace(/\/$/, '')}${rel}`;
  const url = `${base.origin}${pathname === '' ? '/' : pathname}${search}`;
  if (parts.includes('') || network.parse(url)?.href !== url) {
    const message = `the path ${JSON.stringify(parts)} holds a part that is no one part of an address`;
    throw refused(urlNotAllowed.issue(message));
  }
  return { url, rel: rel === '' ? '/' : rel };
}

/**
 * @returns the token of the server, or undefined for a remote without one
 * @throws a refusal ENV_MISSING for a variable that is not set or holds no token
 */
export function tokenOf(server: Server, env: Env) {
  if (server.auth === undefined) return undefined;
  const variable = tokens.get(server.auth);
  if (variable === undefined) throw bug(`the auth of ${server.name} was not made by bearer()`);
  const token = env[variable];
  if (token === undefined || token === '')
    throw refused(envMissing.issue(`${variable} is not set`));
  if (TOKEN.test(token) === false) {
    throw refused(envMissing.issue(`${variable} holds characters a token cannot hold`));
  }
  return token;
}

/**
 * @param remote - a remote the tool lists
 * @param network - the parser of the call
 * @returns one DECLARATION issue for a remote no remote() made, a fallback or a fixed address
 * that adx does not send to or that would carry the token over plain http beyond the machine,
 * and an auth no bearer() made
 */
export function setupIssuesOf(remote: Remote, network: Network): Issue[] {
  const server = servers.get(remote);
  if (server === undefined)
    return [declaration.issue('a remote of the tool was not made by remote()')];
  const auth = server.auth;
  const base = declaredBase(server, network);
  return [
    ...(base === undefined ? [declaration.issue(notAddress(server))] : []),
    ...(base !== undefined && exposes(server, base) ? [declaration.issue(exposed(server))] : []),
    ...(auth === undefined || tokens.has(auth)
      ? []
      : [declaration.issue(`the auth of ${server.name} was not made by bearer()`)]),
  ];
}

/**
 * The check of a call before it writes a file, so a send that cannot leave refuses first.
 *
 * @throws as addressOf and tokenOf do for the address and the token of the server
 */
export function ready(server: Server, env: Env, network: Network) {
  baseOf(server, env, network);
  tokenOf(server, env);
}

// A variable is the caller's, so its address is refused as a fix; the tool's own is a bug.
function baseOf(server: Server, env: Env, network: Network): Address {
  const declared = envUrls.get(server.url);
  const given = declared === undefined ? undefined : env[declared.variable];
  if (declared !== undefined && given !== undefined) {
    return givenBase(server, declared.variable, network.parse(given));
  }
  const base = declaredBase(server, network);
  if (base === undefined) throw bug(notAddress(server));
  if (exposes(server, base)) throw bug(exposed(server));
  return base;
}

function givenBase(server: Server, variable: string, parsed: Address | undefined) {
  const base = allowed(parsed);
  if (base === undefined) {
    const message = `${variable} names no http or https address without user, query or fragment`;
    throw refused(urlNotAllowed.issue(message));
  }
  if (exposes(server, base)) {
    const message = `${variable} names ${base.origin}, and the token of ${server.name} ${TOKEN_ROUTES}`;
    throw refused(urlNotAllowed.issue(message));
  }
  return base;
}

// A remote with a token sends it with every request, so its address decides who can read it.
const exposes = (server: Server, base: Address) =>
  server.auth !== undefined && carriesToken(base) === false;

// An allow-list: https, or http to the machine itself; a scheme added to SCHEMES carries none.
const carriesToken = (base: Address) =>
  base.protocol === 'https:' || (base.protocol === 'http:' && LOOPBACK_HOSTS.has(base.hostname));

const TOKEN_ROUTES = `goes only over https, or over http to ${[...LOOPBACK_HOSTS].join(', ')}`;

const exposed = (server: Server) =>
  `the address of ${server.name} may carry no token: its token ${TOKEN_ROUTES}`;

const declaredBase = (server: Server, network: Network) =>
  allowed(network.parse(envUrls.get(server.url)?.fallback ?? server.url));

const notAddress = (server: Server) =>
  `the address of ${server.name} is no http or https address without user, query or fragment`;

const allowed = (address: Address | undefined) =>
  address !== undefined &&
  SCHEMES.has(address.protocol) &&
  address.username === '' &&
  address.password === '' &&
  address.search === '' &&
  address.hash === ''
    ? address
    : undefined;

const refused = (issue: Issue) => refusedWith([issue], NOTHING_CHANGED);

const bug = (message: string) => refused(declaration.issue(message));
