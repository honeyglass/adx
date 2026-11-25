/**
 * A code a tool declares once, with its kind and hint, and raises as issues.
 *
 * Code, code: the declared code, and the function that declares it.
 * factsOf: the name, kind and hint of a code, as `schema` lists them.
 * codesMade: every code code() made in the process, in the order it made them.
 *
 * Nothing is checked when code() is called: a tool declares its codes when its files load. Each
 * code() also registers its code in the one registry of the process, so `schema` lists codes a
 * tool never raised (decision 87). A code is a value of the tool's files and knows no tool, so a
 * test with two tools in one process lists the codes of both in each.
 *
 * @example const noFormal = code('NO_FORMAL_GREETING', 'fix', 'Greet casually');
 */
import { Issue, issueAnswer, kindOfIssue } from "./issue.js";
/** The one registry of the process, which code() fills and nothing empties. */
const made = [];
export function code(name, kind, hint) {
    const declared = new Declared(name, kind, hint);
    made.push(declared);
    return declared;
}
export const codesMade = () => made;
/** An issue without a message repeats the hint of its code, so one issue tells all three. */
export function factsOf(declared) {
    const issue = declared.issue();
    return { code: issue.code, kind: kindOfIssue(issue), hint: issueAnswer(issue).hint };
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
