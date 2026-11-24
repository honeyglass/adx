/**
 * The remotes of one call: its variables, its network or its fakes, and the requests it sent.
 *
 * Line, lineNow: the remotes of a call, and those of the call that runs now.
 *
 * A handler reads through a remote it imported, with no call at hand, so a call keeps its line
 * among its values. The line lets a request out only to a remote its tool lists, through the
 * fake a test gave for that remote, else through the network. It counts each send by its label
 * and outcome, so a refusal after a send says what the call left (the guide: answered, refused,
 * or sent without an answer). Before a call writes a file, ready() checks the address and the
 * token of every remote, since adx cannot know which one `apply` sends through.
 *
 * Under the test kit, a request reaches a fake or the machine itself, and nothing beyond it, so a
 * test never sends to a real server with a token of its samples. The kit is a call with fakes,
 * as run(), invoke() and conformance make it, or a program whose variable ADX_FAKES_ONLY is 1,
 * which conformance sets; no other value changes anything.
 *
 * @example return new Line(shell, around).run(() => answeredIn(shell, call));
 */
import { UNSAFE_RUN } from '@honeyglass/utils/ts';
import { declaration, entered, refusedWith, UNKNOWN_STATE, valueOf } from '../core/index.ts';
import type { Incoming, Outgoing, Remote, Surroundings, Unreached } from '../core/index.ts';
import { addressOf, ready, serverOf, tokenOf } from './address.ts';
import { fakeAnswer } from './fake.ts';
import { ANSWER_BYTES, FAKES_ONLY, LOOPBACK, TIMEOUT_MS } from './limits.ts';

type Query = Readonly<Record<string, string | number | undefined>>;

/** A request ready to leave: what the network sends, and the path a fake matches. */
export type Target = { remote: Remote; outgoing: Outgoing; rel: string; what: string };

type Sent = { label: string; outcome: 'answered' | 'refused' | 'unanswered' };

/** Each outcome with the words a state names it by, in the order the state lists them. */
const OUTCOMES: readonly [Sent['outcome'], string][] = [
  ['answered', 'Answered'],
  ['refused', 'Refused'],
  ['unanswered', 'Sent without an answer, may have taken effect'],
];

export class Line {
  readonly #tool: { name: string; remotes: readonly Remote[] };
  readonly #around: Surroundings;
  readonly #sent: Sent[] = [];

  constructor(tool: { name: string; remotes: readonly Remote[] }, around: Surroundings) {
    this.#tool = tool;
    this.#around = around;
  }

  run<T>(work: () => Promise<T>) {
    return entered(this.#around.scope, Line, this, work);
  }

  /**
   * @param remote - the remote that sends
   * @param method - GET, or the method of a request
   * @param path - the parts of the path below the address of the server
   * @param more - the query, and the body as JSON
   * @returns the request, ready to leave
   * @throws a refusal DECLARATION for a remote the tool does not list, URL_NOT_ALLOWED and
   * ENV_MISSING as addressOf and tokenOf say
   */
  target(
    remote: Remote,
    method: string,
    path: readonly (string | number)[],
    more: { query?: Query; body?: string },
  ): Target {
    const server = serverOf(remote);
    if (server === undefined || this.#tool.remotes.includes(remote) === false) {
      const name = server?.name ?? 'that no remote() made';
      throw bug(`a request goes to the remote ${name}, and ${this.#tool.name} does not list it`);
    }
    const { env, network } = this.#around;
    const { url, rel } = addressOf(server, env, network, path, more.query ?? {});
    const origin = network.parse(url)?.origin ?? url;
    if (this.#leaves(remote, origin)) {
      throw bug(
        `the remote ${server.name} has no fake in this test, and a request to ${origin} would leave the machine: add a fake of ${server.name} to the samples`,
      );
    }
    const token = tokenOf(server, env);
    const headers = {
      accept: 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...(more.body === undefined ? {} : { 'content-type': 'application/json' }),
    };
    const outgoing = {
      url,
      method,
      headers,
      body: more.body,
      timeout: TIMEOUT_MS,
      limit: ANSWER_BYTES,
    };
    return { remote, outgoing, rel, what: `${method} ${rel}` };
  }

  /** A remote with a fake of the test answers from it, and no request leaves the process. */
  exchange(target: Target): Promise<Incoming | Unreached> {
    const fake = this.#fakeOf(target.remote);
    if (fake !== undefined) return fakeAnswer(fake, target.outgoing.method, target.rel);
    return this.#around.network.send(target.outgoing);
  }

  /** A fake answers at once, so a test of a busy server waits for nothing. */
  async pause(remote: Remote, ms: number) {
    if (this.#fakeOf(remote) === undefined) await this.#around.network.pause(ms);
  }

  /** @returns the send, which counts as without an answer until its answer comes */
  sending(label: string): Sent {
    const sent: Sent = { label: label.replace(UNSAFE_RUN, ' '), outcome: 'unanswered' };
    this.#sent.push(sent);
    return sent;
  }

  /** @throws as the first request to a remote of the tool would, before any is made */
  ready() {
    for (const remote of this.#tool.remotes) {
      const server = serverOf(remote);
      if (server !== undefined) ready(server, this.#around.env, this.#around.network);
    }
  }

  /** @returns whether the call sent a request, which may have taken effect */
  sent() {
    return this.#sent.length > 0;
  }

  /** @returns one sentence per outcome of the sends of the call, for the state of a refusal */
  state() {
    return OUTCOMES.flatMap(([outcome, words]) => {
      const labels = this.#sent.filter(sent => sent.outcome === outcome).map(sent => sent.label);
      return labels.length === 0 ? [] : [`${words}: ${labels.join(', ')}.`];
    });
  }

  // The one check of the kit's network: no fake, an address beyond the machine, under the kit.
  #leaves(remote: Remote, origin: string) {
    const kit = this.#around.fakes !== undefined || this.#around.env[FAKES_ONLY] === '1';
    return kit && this.#fakeOf(remote) === undefined && LOOPBACK.test(origin) === false;
  }

  #fakeOf(remote: Remote) {
    return this.#around.fakes?.find(fake => fake.remote === remote);
  }
}

/** @throws a bug refusal, DECLARATION, for a remote used while no call of its tool runs */
export function lineNow(): Line {
  const line = valueOf(Line);
  if (line instanceof Line) return line;
  throw bug('a remote was used while no call of its tool ran');
}

// A request may be made while a refusal after a send is answered, so the state is not known.
const bug = (message: string) => refusedWith([declaration.issue(message)], UNKNOWN_STATE);
