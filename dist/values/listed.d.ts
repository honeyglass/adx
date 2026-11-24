import type { Known, Listed, Sourced } from '../core/index.ts';
export declare function listed(command: Sourced, field: string, called: Known): Promise<Listed>;
