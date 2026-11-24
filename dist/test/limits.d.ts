/**
 * The constants of test/.
 *
 * LONG_LIST, LARGE_ANSWER: when an answer is a long list or a large document (decision 56).
 * PROBE: the word the probes give where a call must not know it.
 * STORED_FILE, STORED_FILE_BYTES: the file of the fingerprints of stored kinds (decision 55),
 * and how much of it the kit reads.
 * FRONTMATTER_BYTES: how much of a skill the kit reads to find its frontmatter.
 *
 * @example if (bytes > LARGE_ANSWER) findings.push(`${line} answers ${bytes} bytes`);
 */
/** More entries than fifty in one array of an answer make a long list. */
export declare const LONG_LIST = 50;
/** More bytes than 8 KiB make a large answer. */
export declare const LARGE_ANSWER = 8192;
/** A command, option, word and field no tool has, since a tool names none with this prefix. */
export declare const PROBE = "adx-probe";
export declare const STORED_FILE = "adx.stored.json";
/** A mebibyte, far beyond the fingerprints of any tool. */
export declare const STORED_FILE_BYTES = 1048576;
/** Four KiB, far beyond a frontmatter with a name and a description. */
export declare const FRONTMATTER_BYTES = 4096;
