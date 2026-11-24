import type { Piped } from '../core/index.ts';
/**
 * @returns the text piped in, at most one character past the limit, `utf8: false` for bytes that
 * are no UTF-8, or null for a terminal
 * @throws a refusal SYSTEM_REFUSED, kind ask, when stdin cannot be read
 */
export declare function stdinText(): Promise<Piped>;
