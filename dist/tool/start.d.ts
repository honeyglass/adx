import type { Answered } from '../command/index.ts';
import type { Shell } from './tool.ts';
/** @param shell - what the call reads of the tool */
export declare function started(shell: Shell): Promise<Answered>;
