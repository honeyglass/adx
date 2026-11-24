import type { Known, Probing } from './probing.ts';
export type Probe = {
    name: string;
    /** What the author does when the probe fails. */
    next: string;
    /** Whether it calls a command only with its example, so it leaves out one without. */
    example?: true;
    findings: (probing: Probing, known: Known) => Promise<string[]>;
};
export declare const PROBES: readonly Probe[];
