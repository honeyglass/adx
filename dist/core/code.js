/**
 * A code a tool declares once, with its kind and hint, and raises as issues.
 *
 * Code, code: the declared code, and the function that declares it.
 *
 * Nothing is checked when code() is called: a tool declares its codes when its files load.
 *
 * @example const noFormal = code('NO_FORMAL_GREETING', 'fix', 'Greet casually');
 */
import { Issue } from "./issue.js";
export function code(name, kind, hint) {
    return new Declared(name, kind, hint);
}
class Declared {
    #name;
    #kind;
    #hint;
    constructor(name, kind, hint) {
        this.#name = name;
        this.#kind = kind;
        this.#hint = hint;
    }
    at(path, message) {
        const parts = typeof path === 'string' ? [path] : path;
        return new Issue(this.#name, parts, this.#partsOf(message));
    }
    issue(message) {
        return new Issue(this.#name, undefined, this.#partsOf(message));
    }
    // Without a message, the issue repeats the hint of its code.
    #partsOf(message = this.#hint) {
        return { kind: this.#kind, message, hint: this.#hint };
    }
}
