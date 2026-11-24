/**
 * Remotes: the servers a tool talks to, the requests of `apply`, and the fakes of a test.
 *
 * remote, envUrl, bearer: a server, its address from a variable, and its token from one.
 * act: the send of `apply`, which the tool hands every command.
 * Line: the remotes of one call, which the tool runs each call on.
 * variablesOf, setupIssuesOf: the variables of a remote, which `schema` names, and what of it
 * the start checks.
 * fake, reply, Json, Reply: a fake server of a test, and an answer with a status.
 * heard, fakeAnswer, urlVariableOf: a fake the test kit hears, what a fake answers, and the
 * variable that points a program at it.
 * FAKES_ONLY: the variable with which the test kit closes the network of a program it runs.
 *
 * @example const api = remote('ship', { url: envUrl('SHIP_URL', fallback), auth: bearer('SHIP_TOKEN') });
 */
export { bearer, envUrl, setupIssuesOf, urlVariableOf, variablesOf } from './address.ts';
export { act } from './exchange.ts';
export { fake, fakeAnswer, heard, reply } from './fake.ts';
export type { Json, Reply } from './fake.ts';
export { FAKES_ONLY } from './limits.ts';
export { Line } from './line.ts';
export { remote } from './remote.ts';
