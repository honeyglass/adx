/**
 * A command as a value: what read(), list() and effect() return, and a tool lists in its table.
 *
 * Entry: a command as the command table sees it; only the global input it was made for counts.
 * Command, ListCommand: the types of core/, passed on.
 * CommandValue, ListValue: the value, with the words that call it, its steps and invoke.
 * AnyCommand, RealOf, InputOf, GlobalOf: any command, and what its real run answers and takes.
 * runnerOf: the runner behind a value of the table, for the tool; undefined for a group.
 *
 * A command carries only the members proto/adx/index.d.ts declares; what runs a call stays in a
 * table beside it, so the tool reaches it and an author does not. Its type is the interface of
 * core/, as declared, so a type of the class, such as its private runner, never shows in the API.
 *
 * @example const answer = await greet.invoke({ name: 'Ada' });
 */
import { $try } from '@honeyglass/utils/ts';
import { answerOfError, builtFor, commandStep, realRun } from "../core/index.js";
import { Runner } from "./runner.js";
const runners = new WeakMap();
/** @returns the runner of a command, or undefined for a group or any other value */
export const runnerOf = (entry) => runners.get(entry);
/** The value read() and effect() make; its runner stays in the table beside it. */
export class CommandValue {
    #runner;
    constructor(kind, spec, global) {
        this.#runner = new Runner(kind, spec, global);
        runners.set(this, this.#runner);
    }
    /** The words that call the command, such as `ticket list`. The tool that lists it sets them. */
    get name() {
        return this.#runner.name;
    }
    /** A field the step gives a value is not one it can list, so `.lists` of it does not compile. */
    step(input) {
        return commandStep(this.#runner, { ...input });
    }
    async invoke(input, options = {}) {
        const run = {
            dryRun: options.dryRun ?? false,
            fields: undefined,
            lists: undefined,
            page: undefined,
            replace: options.replace ?? false,
            folders: {},
        };
        const scene = { env: options.env, seed: options.seed, fakes: options.fakes };
        const { data, error } = await $try(() => this.#runner.through(input, run, scene));
        return error === null ? data.answer : answerOfError(error).answer;
    }
}
export class ListValue extends CommandValue {
    item;
    constructor(spec, global) {
        super('list', spec, global);
        this.item = spec.item;
    }
}
