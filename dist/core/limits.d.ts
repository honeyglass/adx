/**
 * The constants of core/.
 *
 * CHAIN_LIMIT: how many errors of a cause chain status() reads.
 * STDIN_LIMIT: how many characters of stdin `--json -` takes, counted as code points.
 *
 * @example if (depth === CHAIN_LIMIT) return undefined;
 */
/** Ten, as causeText of @honeyglass/utils reads, so a cause that names itself ends. */
export declare const CHAIN_LIMIT = 10;
/** A mebibyte of text, far beyond the input of any command, so only a mistake reaches it. */
export declare const STDIN_LIMIT = 1048576;
