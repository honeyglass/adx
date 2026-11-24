import { Command, ListCommand } from "./command.js";
/**
 * Each kind is a property, not a method, so `const { read } = project` keeps its global input.
 */
export class Kinds {
    #global;
    constructor(global) {
        this.#global = global;
    }
    /** With `output`, `run` must answer what the schema declares. */
    read = (spec) => new Command('read', spec, this.#global);
    list = (spec) => new ListCommand(spec, this.#global);
    effect = (spec) => new Command('effect', spec, this.#global);
}
const plain = new Kinds(undefined);
/** For a tool without global input. A tool with one takes the three from its `global(...)`. */
export const read = plain.read;
export const list = plain.list;
export const effect = plain.effect;
