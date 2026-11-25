/**
 * The constants of test/.
 *
 * PROBE: the word the probes give where a call must not know it.
 * STORED_FILE, STORED_FILE_BYTES: the file of the fingerprints of stored kinds (decision 55),
 * and how much of it the kit reads.
 * FRONTMATTER_BYTES: how much of a skill the kit reads to find its frontmatter.
 * REPORT_NAME, REPORT_GAP, REPORT_STATUS: the columns of adxcheck report, as the guide shows it.
 *
 * @example const other = await probing.alone({ argv: ['schema', '--output', PROBE] });
 */
/** A command, option, word and field no tool has, since a tool names none with this prefix. */
export const PROBE = 'adx-probe';
export const STORED_FILE = 'adx.stored.json';
/** A mebibyte, far beyond the fingerprints of any tool. */
export const STORED_FILE_BYTES = 1_048_576;
/** Four KiB, far beyond a frontmatter with a name and a description. */
export const FRONTMATTER_BYTES = 4096;
/** The status of a rule starts at column 20, or two spaces after a longer name. */
export const REPORT_NAME = 20;
export const REPORT_GAP = 2;
/** The reason starts 13 characters after the status: "not probed" and three spaces. */
export const REPORT_STATUS = 13;
