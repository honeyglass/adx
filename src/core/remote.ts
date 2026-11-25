/**
 * The types of remotes, as proto/adx/index.d.ts declares them, and the port to the network.
 *
 * Remote, Request, Auth: a server a tool talks to, a request that changes something, its token.
 * Act, Fake: the send of `apply`, and a fake server of a test.
 * Network, Address, Outgoing, Incoming, Unreached: the port a remote reaches a server through,
 * an address as it reads one, a request as it leaves the program, the answer of the server, and
 * a request that got no whole answer.
 * noFakeLead, kitMark: how the refusal of a request the test kit's closed network stops begins,
 * and how it ends, with the kit's token, so the kit tells it from a refusal a program prints.
 *
 * The types stand in core/, since command/ types `apply` with Act and invoke with Fake, and
 * remote/ makes the values. An Incoming has a status and headers, so status() and the guide's
 * table of unmapped errors read it as an HTTP answer when a refusal keeps it as its cause.
 *
 * @example const ticket = await act.send('the new ticket', api.post(path, data), Ticket);
 */
import type { Observable } from 'rxjs';
import type { z } from 'zod';

type Path = readonly (string | number)[];
type Query = Record<string, string | number | undefined>;
/** Maps a status to the value `get` answers for it, such as `{ 404: undefined }`. */
type On = { readonly [status: number]: unknown };

export interface Request {
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export interface Remote {
  get<S extends z.ZodType, const O extends On = {}>(
    path: Path,
    answer: S,
    options?: { query?: Query; on?: O },
  ): Promise<z.output<S> | O[keyof O]>;
  post(path: Path, body: unknown): Request;
  put(path: Path, body: unknown): Request;
  patch(path: Path, body: unknown): Request;
  delete(path: Path): Request;
}

export interface Auth {}

export interface Act {
  send<S extends z.ZodType>(label: string, request: Request, answer: S): Promise<z.output<S>>;
}

export interface Fake {
  readonly remote: Remote;
}

/** The parts of an address the WHATWG URL parser reads, the one fetch reads too. */
export type Address = {
  readonly href: string;
  readonly protocol: string;
  readonly origin: string;
  readonly hostname: string;
  readonly username: string;
  readonly password: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
};

/** `limit` is the most bytes of answer the request reads; `timeout` is in milliseconds. */
export type Outgoing = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeout: number;
  readonly limit: number;
};

/** The body: its text, or past the limit of the request, or bytes that are no UTF-8. */
export type Incoming = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: { text: string } | { tooLarge: true } | { utf8: false };
};

/** Any error the network raised before a whole answer came, kept whole as it was raised. */
export type Unreached = { readonly unreached: unknown };

/** A redirect is answered, never followed. */
export interface Network {
  /** Undefined for a text that is no address. */
  parse(url: string): Address | undefined;
  /** Cold: each subscription sends once, and an unsubscribe before the answer aborts the request. */
  send(request: Outgoing): Observable<Incoming | Unreached>;
}

/** @returns the start of the message of a request to the remote that no fake answers */
export const noFakeLead = (name: string) => `the remote ${name} has no fake in this test`;

/** @returns the end of that message, with the token the kit closed the network with */
export const kitMark = (token: string) => ` [kit ${token}]`;
