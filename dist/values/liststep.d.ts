import type { Known, Sourced, Step } from '../core/index.ts';
/**
 * @param command - the command whose field it is
 * @param field - the field
 * @param given - the input of the call as its caller gave it
 * @returns the step, or undefined for a field without a source
 */
export declare function listStep(command: Sourced, field: string, given: Known['given']): Step | undefined;
export declare function optionText(command: Sourced, field: string): string;
