import type { Known, Sourced } from '../core/index.ts';
/**
 * A refusal of a source, such as a busy server, is an answer adx cannot check by: the value stays
 * out, and the refusal being answered stands. Any other error, and a refusal of kind bug, is a bug
 * of the tool and flies on (decision 76).
 *
 * @param command - the command the step names
 * @param field - the field the step carries
 * @param value - the value of the refused call, which passed the field's schema
 * @param beside - the other fields the real call would hold, as given and checked
 * @returns whether the source takes the value; true for a field without a source
 */
export declare function accepts(command: Sourced, field: string, value: unknown, beside: Known): Promise<boolean>;
