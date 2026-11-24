import type { Scene } from '../command/index.ts';
import type { Surroundings } from '../core/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param scene - the variables, the seed and the working directory the test names
 * @param work - the call in these surroundings
 * @returns what the work answers; its error is thrown again once the folders are removed
 */
export declare function inScratch<T>(shell: Shell, scene: Scene & {
    cwd?: string;
}, work: (around: Surroundings) => Promise<T>): Promise<T>;
