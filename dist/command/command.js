import { $try } from '@honeyglass/utils/ts';
import { answerOfError, NOTHING_CHANGED, refusalAnswer, Refused, refusedWith, schemaFailed, } from "../core/index.js";
/**
 * The tool answers a command through this table and not through invoke: invoke answers a bug
 * itself, while the tool also writes the bug's error to stderr.
 */
const answerers = new WeakMap();
/**
 * @param entry - a value of the command table
 * @returns its answerer, which rejects on every error, or undefined for a value read() did not make
 */
export const answererOf = (entry) => answerers.get(entry);
export class Command {
    #spec;
    constructor(spec) {
        this.#spec = spec;
        answerers.set(this, input => this.#answered(input));
    }
    /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
    async invoke(input) {
        const { data, error } = await $try(() => this.#answered(input));
        return error === null ? data : answerOfError(error).answer;
    }
    /**
     * A field the schema does not name is refused, never dropped, and the handler runs only on an
     * input that passed. A refusal the handler returns is thrown, as one it throws.
     */
    async #answered(input) {
        const parsed = this.#spec.input.safeParse(input);
        const unnamed = unnamedIssues(this.#spec.input, input);
        if (parsed.success && unnamed.length === 0) {
            const result = await this.#spec.run(parsed.data);
            if (result instanceof Refused)
                throw result;
            return { ok: true, result };
        }
        const failed = parsed.success ? [] : parsed.error.issues;
        const [first, ...rest] = [...unnamed, ...failed.map(i => schemaIssue(i.path, i.message))];
        return refusalAnswer(refusedWith([first, ...rest], NOTHING_CHANGED));
    }
}
function unnamedIssues(schema, input) {
    return Object.keys(input)
        .filter(key => Object.hasOwn(schema.shape, key) === false)
        .map(key => schemaFailed.at(key, `the input has no field ${key}`));
}
// An issue at the root of the input names no field, so it has no path.
function schemaIssue(path, message) {
    const [field, ...below] = path;
    if (typeof field !== 'string')
        return schemaFailed.issue(message);
    const parts = [field, ...below.filter(part => typeof part !== 'symbol')];
    return schemaFailed.at(parts, message);
}
