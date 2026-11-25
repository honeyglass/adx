/** @returns the start of the message of a request to the remote that no fake answers */
export const noFakeLead = (name) => `the remote ${name} has no fake in this test`;
/** @returns the end of that message, with the token the kit closed the network with */
export const kitMark = (token) => ` [kit ${token}]`;
/**
 * The token every request carries under ADX_FAKES_ONLY, in place of the one of its variable: a
 * program cannot tell the kit from a caller posing as it, so no secret leaves (decision 89).
 */
export const KIT_TOKEN = 'adx-kit-token';
