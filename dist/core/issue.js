/** The parts of an issue made with no parts, such as `new Issue()`: the maker has a bug. */
const UNRAISED = {
    kind: 'bug',
    message: 'an issue was made without a code',
    hint: 'Raise an issue with code().at() or code().issue()',
};
const partsByIssue = new WeakMap();
export class Issue {
    code;
    constructor(code = 'UNKNOWN_ERROR', path, parts = UNRAISED) {
        this.code = code;
        if (path !== undefined)
            this.path = path;
        partsByIssue.set(this, parts);
    }
    command(step) {
        return new Issue(this.code, this.path, { ...partsOf(this), step });
    }
}
/**
 * @param issue - an issue of a refusal
 * @returns its code, its path with dots, its message and hint, and the command of its step
 */
export function issueAnswer(issue) {
    const { message, hint, step } = partsOf(issue);
    return {
        code: issue.code,
        ...(issue.path === undefined ? {} : { path: issue.path.join('.') }),
        message,
        hint,
        ...(step?.command === undefined ? {} : { command: step.command }),
    };
}
/**
 * A command the issue already names, such as the list call of its field, says more than one
 * adx names for every issue, so it stays.
 *
 * @param issue - an issue of a refusal
 * @param step - the step to the command it gets when it names none
 * @returns the issue with a command
 */
export const withCommand = (issue, step) => partsOf(issue).step === undefined ? issue.command(step) : issue;
/**
 * For an issue whose next move depends on the call, such as a field to give first.
 *
 * @param issue - an issue of a refusal
 * @param hint - what the agent does next
 * @returns the issue with that hint
 */
export const withHint = (issue, hint) => new Issue(issue.code, issue.path, { ...partsOf(issue), hint });
/**
 * For an issue of a value that came from a field, such as a file whose path the input named.
 *
 * @param issue - an issue at no field
 * @param path - the field, and the place below it
 * @returns the issue at that place
 */
export const atField = (issue, path) => new Issue(issue.code, path, partsOf(issue));
/**
 * The tool names the command of such an issue, since only it knows its shapes.
 *
 * @param issue - a SCHEMA issue
 * @param place - where it stands in the schema that failed
 * @returns the issue with its place
 */
export const placed = (issue, place) => new Issue(issue.code, issue.path, { ...partsOf(issue), place });
/** @returns where a SCHEMA issue stands in the schema that failed, or undefined for any other */
export const placeOf = (issue) => partsOf(issue).place;
/** @returns the step the issue names, which the answer writes out, or undefined */
export const stepOf = (issue) => partsOf(issue).step;
/** The kind of the code that raised the issue. */
export const kindOfIssue = (issue) => partsOf(issue).kind;
// An object of the shape of an Issue that no constructor made has no parts.
const partsOf = (issue) => partsByIssue.get(issue) ?? UNRAISED;
