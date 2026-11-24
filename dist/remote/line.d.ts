import type { Incoming, Outgoing, Remote, Surroundings, Unreached } from '../core/index.ts';
type Query = Readonly<Record<string, string | number | undefined>>;
/** A request ready to leave: what the network sends, and the path a fake matches. */
export type Target = {
    remote: Remote;
    outgoing: Outgoing;
    rel: string;
    what: string;
};
type Sent = {
    label: string;
    outcome: 'answered' | 'refused' | 'unanswered';
};
export declare class Line {
    #private;
    constructor(tool: {
        name: string;
        remotes: readonly Remote[];
    }, around: Surroundings);
    run<T>(work: () => Promise<T>): Promise<T>;
    /**
     * @param remote - the remote that sends
     * @param method - GET, or the method of a request
     * @param path - the parts of the path below the address of the server
     * @param more - the query, and the body as JSON
     * @returns the request, ready to leave
     * @throws a refusal DECLARATION for a remote the tool does not list, URL_NOT_ALLOWED and
     * ENV_MISSING as addressOf and tokenOf say
     */
    target(remote: Remote, method: string, path: readonly (string | number)[], more: {
        query?: Query;
        body?: string;
    }): Target;
    /** A remote with a fake of the test answers from it, and no request leaves the process. */
    exchange(target: Target): Promise<Incoming | Unreached>;
    /** A fake answers at once, so a test of a busy server waits for nothing. */
    pause(remote: Remote, ms: number): Promise<void>;
    /** @returns the send, which counts as without an answer until its answer comes */
    sending(label: string): Sent;
    /** @throws as the first request to a remote of the tool would, before any is made */
    ready(): void;
    /** @returns whether the call sent a request, which may have taken effect */
    sent(): boolean;
    /** @returns one sentence per outcome of the sends of the call, for the state of a refusal */
    state(): string[];
}
/** @throws a bug refusal, DECLARATION, for a remote used while no call of its tool runs */
export declare function lineNow(): Line;
export {};
