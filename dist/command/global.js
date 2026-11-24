/**
 * The input every command of a tool shares, such as `--project`.
 *
 * Global, global: the shared input, and the three kinds with it typed into every handler and
 * its sources known to every command.
 *
 * With global() the input is declared before the commands, so a command knows its type without
 * importing the tool; the tool takes the same value as its `global`.
 *
 * @example const { read } = global({ input: z.object({ project: id() }), example: { project: 'web' } });
 */
import { Kinds } from "./kinds.js";
export class Global extends Kinds {
    input;
    constructor(input, values, example) {
        super({ input, values, example });
        this.input = input;
    }
}
/** A global field goes to every kind of command, so it takes no name of an option of any kind. */
export function global(spec) {
    return new Global(spec.input, spec.values ?? {}, spec.example);
}
