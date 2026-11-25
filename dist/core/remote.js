/** @returns the start of the message of a request to the remote that no fake answers */
export const noFakeLead = (name) => `the remote ${name} has no fake in this test`;
/** @returns the end of that message, with the token the kit closed the network with */
export const kitMark = (token) => ` [kit ${token}]`;
