/**
 * The kind of a refusal: who acts next.
 *
 * Kind: fix, retry, ask or bug, the four an answer of adx names.
 * kindOf: the kind of a refusal from @honeyglass/utils as an answer names it.
 *
 * @example const kind = kindOf(error.kind);
 */
import type { Refusal } from '@honeyglass/utils/ts';

export type Kind = 'fix' | 'retry' | 'ask' | 'bug';

/**
 * A refusal of kind blocked becomes ask: an answer has no blocked, and only the person can open
 * a route that is shut.
 *
 * @param kind - the kind of a RefusalError
 * @returns the kind the answer names
 */
export const kindOf = (kind: Refusal['kind']): Kind => (kind === 'blocked' ? 'ask' : kind);
