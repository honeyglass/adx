import type { Runner } from '../command/index.ts';
import type { Detail } from '../list/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param list - the list command
 * @returns each command of the tool with a field whose source is detailOf(list)
 */
export declare function detailsOf(shell: Shell, list: Runner): (Detail & {
    target: Runner;
})[];
