import type { Called } from './caller.ts';
import type { Known, Probing } from './probing.ts';
export type Probe = {
    name: string;
    /** What the author does when the probe fails. */
    next: string;
    /** Whether it calls a command only with its example, so it leaves out one without. */
    example?: true;
    /** Why the tool gives it nothing to call, such as no effect for the dry runs; else undefined. */
    idle?: (known: Known) => string | undefined;
    /** Why it could not probe all it calls, read once it ran, such as a fake missing; else undefined. */
    unprobed?: (probing: Probing, known: Known) => string | undefined;
    /** The calls that are its own, when they are no calls it made itself. */
    calls?: (probing: Probing) => readonly Called[];
    findings: (probing: Probing, known: Known) => Promise<string[]>;
};
export declare const PROBES: readonly Probe[];
/** @returns the number of calls in words, such as "1 call" or "7 calls" */
export declare const countOf: (count: number) => string;
export declare const quotedNames: (names: readonly string[]) => string;
