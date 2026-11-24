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
/** The kind of the code that raised the issue. */
export const kindOfIssue = (issue) => partsOf(issue).kind;
// An object of the shape of an Issue that no constructor made has no parts.
const partsOf = (issue) => partsByIssue.get(issue) ?? UNRAISED;
