import type { Issue } from '../core/index.ts';
import type { Shell } from './tool.ts';
/** @param shell - what the call reads of the tool */
export declare function setupIssues(shell: Shell): Issue[];
