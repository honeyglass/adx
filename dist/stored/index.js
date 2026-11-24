/**
 * Stored kinds: the kinds of data a tool keeps in files, each with the number of its format.
 *
 * stored: a kind, which writes its number and reads an older format converted.
 * kindIssues: the DECLARATION issues of a listed kind's formats, for the start checks.
 * formatsOf: the number and the schema of each format of a kind, for the test kit's fingerprints.
 *
 * @example import { kindIssues, stored } from '../stored/index.ts';
 */
export { kindIssues } from "./checks.js";
export { formatsOf, stored } from "./stored.js";
