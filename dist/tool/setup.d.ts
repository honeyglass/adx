import type { Issue, Network } from '../core/index.ts';
import type { Shell } from './tool.ts';
/**
 * @param shell - what the call reads of the tool
 * @param network - the parser of the call, which reads each address as its requests would
 */
export declare function setupIssues(shell: Shell, network: Network): Issue[];
