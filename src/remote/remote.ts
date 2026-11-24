/**
 * A remote: one server a tool talks to in JSON over HTTP.
 *
 * remote: the remote under its name, at an address, with a token if it needs one.
 *
 * Nothing is checked when a remote is made: a tool makes it when its files load, and each call
 * checks the address and the token it reads. `get` reads at once; post, put, patch and delete
 * only build a request, which act.send in `apply` sends, so a dry run cannot send it. A remote
 * has the members its declaration names; what it is stands beside it, in address.ts.
 *
 * @example export const api = remote('tracker', { url: envUrl('TRACKER_URL', fallback), auth });
 */
import type { z } from 'zod';
import type { Auth, Remote, Request } from '../core/index.ts';
import { made } from './address.ts';
import { read, request } from './exchange.ts';

type Path = readonly (string | number)[];
type Query = Record<string, string | number | undefined>;
type On = { readonly [status: number]: unknown };

export function remote(name: string, at: { url: string; auth?: Auth }): Remote {
  const server = new Server();
  made(server, { name, url: at.url, auth: at.auth });
  return server;
}

class Server implements Remote {
  get<S extends z.ZodType, const O extends On = {}>(
    path: Path,
    answer: S,
    options: { query?: Query; on?: O } = {},
  ): Promise<z.output<S> | O[keyof O]> {
    return read(this, path, answer, options);
  }

  post(path: Path, body: unknown): Request {
    return request('POST', { remote: this, path, body });
  }

  put(path: Path, body: unknown): Request {
    return request('PUT', { remote: this, path, body });
  }

  patch(path: Path, body: unknown): Request {
    return request('PATCH', { remote: this, path, body });
  }

  delete(path: Path): Request {
    return request('DELETE', { remote: this, path, body: undefined });
  }
}
