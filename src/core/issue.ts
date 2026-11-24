/**
 * One issue of a refusal: a code at a field, at a place below it, or at no field.
 *
 * Path: the place of an issue, a field first.
 * Issue, Parts: what a code raises, and what it holds beside its code and path.
 * issueAnswer: the issue as the answer writes it.
 * withCommand, stepOf: the issue with a command, unless it names one of its own, and its step.
 *
 * The parts stay in a table beside the issue, not in private fields: an Issue then has the
 * members proto/adx/index.d.ts declares and no other, so the built type equals the declared one.
 *
 * @example const issue = new Issue('SCHEMA', ['name'], { kind: 'fix', message, hint });
 */
import type { Kind } from './kind.ts';
import type { Step } from './step.ts';

export type Path<P extends string> = readonly [P, ...(string | number)[]];

export type Parts = { kind: Kind; message: string; hint: string; step?: Step };

/** The parts of an issue made with no parts, such as `new Issue()`: the maker has a bug. */
const UNRAISED: Parts = {
  kind: 'bug',
  message: 'an issue was made without a code',
  hint: 'Raise an issue with code().at() or code().issue()',
};

const partsByIssue = new WeakMap<Issue, Parts>();

export class Issue<P extends string = string> {
  readonly code: string;
  /** Absent, not undefined, on an issue at no field, so the answer has no path. */
  declare readonly path?: Path<P>;

  constructor(code = 'UNKNOWN_ERROR', path?: Path<P>, parts = UNRAISED) {
    this.code = code;
    if (path !== undefined) this.path = path;
    partsByIssue.set(this, parts);
  }

  command(step: Step): Issue<P> {
    return new Issue(this.code, this.path, { ...partsOf(this), step });
  }
}

/**
 * @param issue - an issue of a refusal
 * @returns its code, its path with dots, its message and hint, and the command of its step
 */
export function issueAnswer(issue: Issue) {
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
export const withCommand = (issue: Issue, step: Step) =>
  partsOf(issue).step === undefined ? issue.command(step) : issue;

/** @returns the step the issue names, which the answer writes out, or undefined */
export const stepOf = (issue: Issue) => partsOf(issue).step;

/** The kind of the code that raised the issue. */
export const kindOfIssue = (issue: Issue) => partsOf(issue).kind;

// An object of the shape of an Issue that no constructor made has no parts.
const partsOf = (issue: Issue) => partsByIssue.get(issue) ?? UNRAISED;
