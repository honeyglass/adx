/**
 * A command that reads: its input checked against its schema, then its handler run.
 *
 * Obj, ReadSpec: a Zod object, and what read() takes.
 * Command: the value read() returns; invoke answers one call with typed input.
 * answererOf: the answer of a command for the tool, which lets every error reach its own catch.
 *
 * This is the one file of command/ that reads Zod, so a change of Zod touches one file.
 *
 * @example const answer = await greet.invoke({ name: 'Ada' });
 */
import type { z } from 'zod';
import type { Answer } from '../core/index.ts';
export type Obj = z.ZodObject;
export type ReadSpec<I extends Obj, O> = {
    does: string;
    input: I;
    example?: z.input<I>;
    run: (input: z.output<I>) => O | Promise<O>;
};
type Answerer = (input: object) => Promise<Answer<unknown>>;
/**
 * @param entry - a value of the command table
 * @returns its answerer, which rejects on every error, or undefined for a value read() did not make
 */
export declare const answererOf: (entry: object) => Answerer | undefined;
export declare class Command<I extends Obj, O> {
    #private;
    constructor(spec: ReadSpec<I, O>);
    /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
    invoke(input: z.input<I>): Promise<Answer<O>>;
}
export {};
