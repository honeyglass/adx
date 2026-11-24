/**
 * A step for the person, such as an upload by hand: it has a does and no command.
 *
 * tell: the step.
 *
 * @example next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : []),
 */
import type { Step } from '../core/index.ts';
export declare const tell: (does: string) => Step;
