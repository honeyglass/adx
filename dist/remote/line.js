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
 * Under the test kit, a request reaches only a fake the kit started, so a test never sends to a
 * real server with a token of its samples; the machine itself is no exception, since a tunnel to
 * production lies there too (decision 86). The kit is a call with fakes, as run(), invoke() and
 * conformance make it, where a fake answers in the process, or a program whose ADX_FAKES_ONLY
 * holds the kit's token, which reaches only the origins ADX_FAKE_ORIGINS names.
 *
 * @example return new Line(shell, around).run(() => answeredIn(shell, call));
 */
import { UNSAFE_RUN } from '@honeyglass/utils/ts';
import { defer, of, timer } from 'rxjs';
import { declaration, entered, kitMark, noFakeLead, refusedWith, UNKNOWN_STATE, valueOf, } from "../core/index.js";
import { addressOf, ready, serverOf, tokenOf } from "./address.js";
import { fakeAnswer } from "./fake.js";
import { ANSWER_BYTES, FAKE_ORIGINS, FAKES_ONLY, TIMEOUT_MS } from "./limits.js";
/** Each outcome with the words a state names it by, in the order the state lists them. */
const OUTCOMES = [
    ['answered', 'Answered'],
    ['refused', 'Refused'],
    ['unanswered', 'Sent without an answer, may have taken effect'],
];
export class Line {
    #tool;
    #around;
    #sent = [];
    constructor(tool, around) {
        this.#tool = tool;
        this.#around = around;
    }
    run(work) {
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
    target(remote, method, path, more) {
        const server = serverOf(remote);
        if (server === undefined || this.#tool.remotes.includes(remote) === false) {
            const name = server?.name ?? 'that no remote() made';
            throw bug(`a request goes to the remote ${name}, and ${this.#tool.name} does not list it`);
        }
        const { env, network } = this.#around;
        const { url, rel } = addressOf(server, env, network, path, more.query ?? {});
        const origin = network.parse(url)?.origin ?? url;
        if (this.#leaves(remote, origin)) {
            const token = env[FAKES_ONLY] ?? '';
            const mark = token === '' ? '' : kitMark(token);
            throw bug(`${noFakeLead(server.name)}, and the test kit sends only to its fakes, not to ${origin}: add a fake of ${server.name} to the samples${mark}`);
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
    /** Cold, as the network: a remote with a fake of the test answers from it, in the process. */
    exchange(target) {
        const fake = this.#fakeOf(target.remote);
        if (fake === undefined)
            return this.#around.network.send(target.outgoing);
        return defer(() => fakeAnswer(fake, target.outgoing.method, target.rel));
    }
    /** A fake answers at once and starts no timer, so a test of a busy server waits for nothing. */
    pause(remote, ms) {
        return this.#fakeOf(remote) === undefined ? timer(ms) : of(0);
    }
    /** @returns the send, which counts as without an answer until its answer comes */
    sending(label) {
        const sent = { label: label.replace(UNSAFE_RUN, ' '), outcome: 'unanswered' };
        this.#sent.push(sent);
        return sent;
    }
    /** @throws as the first request to a remote of the tool would, before any is made */
    ready() {
        for (const remote of this.#tool.remotes) {
            const server = serverOf(remote);
            if (server !== undefined)
                ready(server, this.#around.env, this.#around.network);
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
    // The one check of the kit's network: in the process only a fake answers, and a program the
    // kit runs reaches only the origins of the fakes the kit serves; outside the kit, anything.
    #leaves(remote, origin) {
        const { fakes, env } = this.#around;
        if (fakes !== undefined)
            return this.#fakeOf(remote) === undefined;
        if ((env[FAKES_ONLY] ?? '') === '')
            return false;
        return (env[FAKE_ORIGINS] ?? '').split(',').includes(origin) === false;
    }
    #fakeOf(remote) {
        return this.#around.fakes?.find(fake => fake.remote === remote);
    }
}
/** @throws a bug refusal, DECLARATION, for a remote used while no call of its tool runs */
export function lineNow() {
    const line = valueOf(Line);
    if (line instanceof Line)
        return line;
    throw bug('a remote was used while no call of its tool ran');
}
// A request may be made while a refusal after a send is answered, so the state is not known.
const bug = (message) => refusedWith([declaration.issue(message)], UNKNOWN_STATE);
