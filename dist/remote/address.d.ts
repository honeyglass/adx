import type { Auth, Issue, Network, Remote } from '../core/index.ts';
type Env = Readonly<Record<string, string | undefined>>;
type Query = Readonly<Record<string, string | number | undefined>>;
export type Server = {
    name: string;
    url: string;
    auth: Auth | undefined;
};
export declare function envUrl(variable: string, fallback: string, hosts?: readonly string[]): string;
export declare function bearer(variable: string): Auth;
/** Keeps what a remote is beside it, so the remote has the members its declaration names. */
export declare const made: (remote: Remote, server: Server) => undefined;
export declare const serverOf: (remote: Remote) => Server | undefined;
/** @returns each variable of the remote, with what it holds */
export declare function variablesOf(remote: Remote): {
    variable: string;
    does: string;
}[];
/** @returns the name the tool gave the remote, or undefined for a value remote() did not make */
export declare const nameOf: (remote: Remote) => string | undefined;
/** @returns the variable of envUrl() the remote reads its address from, or undefined */
export declare function urlVariableOf(remote: Remote): string | undefined;
/**
 * @param server - the remote that sends
 * @param env - the variables of the call
 * @param network - the parser of the call, the one its requests go through
 * @param path - the parts of the path below the address of the server
 * @param query - the query; an undefined value is left out
 * @param kit - whether the call runs under the test kit, whose own check decides where it sends
 * @returns the address, and the path below the server, as a fake matches it
 * @throws a refusal URL_NOT_ALLOWED for an address adx does not send to, DECLARATION for a
 * fallback or a fixed address of the tool that is none
 */
export declare function addressOf(server: Server, env: Env, network: Network, path: readonly (string | number)[], query: Query, kit: boolean): {
    url: string;
    rel: string;
};
/**
 * @returns the token of the server, or undefined for a remote without one
 * @throws a refusal ENV_MISSING for a variable that is not set or holds no token
 */
export declare function tokenOf(server: Server, env: Env): string | undefined;
/**
 * @param remote - a remote the tool lists
 * @param network - the parser of the call
 * @returns one DECLARATION issue for a remote no remote() made, a fallback or a fixed address
 * that adx does not send to or that would carry the token over plain http beyond the machine,
 * a listed host that is no host as the parser writes it, and an auth no bearer() made
 */
export declare function setupIssuesOf(remote: Remote, network: Network): Issue[];
/**
 * The check of a call before it writes a file, so a send that cannot leave refuses first.
 *
 * @throws as addressOf and tokenOf do for the address and the token of the server
 */
export declare function ready(server: Server, env: Env, network: Network, kit: boolean): void;
export {};
