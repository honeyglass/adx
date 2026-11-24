import type { Issue, Known, Sourced } from '../core/index.ts';
/**
 * @param command - the command of the call
 * @param needed - each field a list needs first, with the field whose list needs it
 * @param known - the input of the call
 * @returns one issue per needed field, in the order of the map
 */
export declare function missingIssues(command: Sourced, needed: ReadonlyMap<string, string>, known: Known): Promise<Issue[]>;
