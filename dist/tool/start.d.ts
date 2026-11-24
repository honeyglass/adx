import type { Answered } from '../command/index.ts';
import type { Moved } from '../files/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param folders - each root the call moved, which the steps carry
 */
export declare function started(shell: Shell, folders: readonly Moved[]): Promise<Answered>;
