/**
 * Remotes: the servers a tool talks to, the requests of `apply`, and the fakes of a test.
 *
 * remote, envUrl, bearer: a server, its address from a variable, and its token from one.
 * act: the send of `apply`, which the tool hands every command.
 * Line: the remotes of one call, which the tool runs each call on.
 * nameOf, variablesOf, setupIssuesOf: the name and the variables of a remote, which `schema`
 * names, and what of it the start checks.
 * fake, reply, Json, Reply: a fake server of a test, and an answer with a status.
 * heard, fakeAnswer, urlVariableOf: a fake the test kit hears, what a fake answers, and the
 * variable that points a program at it.
 * FAKES_ONLY, FAKE_ORIGINS: the variables with which the test kit closes the network of a
 * program it runs, and names the fakes it serves.
 * ANSWER_BYTES, TIMEOUT_MS, RETRIES, PAUSE_MS: the largest answer of a server, how long one try
 * of a request may take, and how often and after which pause a read is tried again, for `schema`.
 *
 * @example const api = remote('ship', { url: envUrl('SHIP_URL', fallback), auth: bearer('SHIP_TOKEN') });
 */
export { bearer, envUrl, nameOf, setupIssuesOf, urlVariableOf, variablesOf } from "./address.js";
export { act } from "./exchange.js";
export { fake, fakeAnswer, heard, reply } from "./fake.js";
export { ANSWER_BYTES, FAKE_ORIGINS, FAKES_ONLY, PAUSE_MS, RETRIES, TIMEOUT_MS } from "./limits.js";
export { Line } from "./line.js";
export { remote } from "./remote.js";
