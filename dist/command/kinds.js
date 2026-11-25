import { CommandValue, ListValue } from "./command.js";
/**
 * Each kind is a property, not a method, so `const { read } = project` keeps its global input.
 */
export class Makers {
    #global;
    constructor(global) {
        this.#global = global;
    }
    read = (spec) => new CommandValue('read', spec, this.#global);
    list = (spec) => new ListValue(spec, this.#global);
    effect = (spec) => new CommandValue('effect', spec, this.#global);
}
const plain = new Makers(undefined);
/** For a tool without global input. A tool with one takes the three from its `global(...)`. */
export const read = plain.read;
export const list = plain.list;
export const effect = plain.effect;
