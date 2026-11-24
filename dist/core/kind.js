/**
 * A refusal of kind blocked becomes ask: an answer has no blocked, and only the person can open
 * a route that is shut.
 *
 * @param kind - the kind of a RefusalError
 * @returns the kind the answer names
 */
export const kindOf = (kind) => (kind === 'blocked' ? 'ask' : kind);
