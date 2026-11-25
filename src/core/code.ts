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
import { Issue, issueAnswer, kindOfIssue } from './issue.ts';
import type { Parts, Path } from './issue.ts';
import type { Kind } from './kind.ts';

export interface Code {
  at<P extends string>(path: P, message?: string): Issue<P>;
  at<const P extends string>(
    path: readonly [P, ...(string | number)[]],
    message?: string,
  ): Issue<P>;
  issue(message?: string): Issue<never>;
}

/** The one registry of the process, which code() fills and nothing empties. */
const made: Code[] = [];

export function code(name: string, kind: Kind, hint: string): Code {
  const declared = new Declared(name, kind, hint);
  made.push(declared);
  return declared;
}

export const codesMade = (): readonly Code[] => made;

/** An issue without a message repeats the hint of its code, so one issue tells all three. */
export function factsOf(declared: Code) {
  const issue = declared.issue();
  return { code: issue.code, kind: kindOfIssue(issue), hint: issueAnswer(issue).hint };
}

class Declared implements Code {
  readonly #name: string;
  readonly #kind: Kind;
  readonly #hint: string;

  constructor(name: string, kind: Kind, hint: string) {
    this.#name = name;
    this.#kind = kind;
    this.#hint = hint;
  }

  at<P extends string>(path: P, message?: string): Issue<P>;
  at<const P extends string>(path: Path<P>, message?: string): Issue<P>;
  at<P extends string>(path: P | Path<P>, message?: string): Issue<P> {
    const parts: Path<P> = typeof path === 'string' ? [path] : path;
    return new Issue(this.#name, parts, this.#partsOf(message));
  }

  issue(message?: string): Issue<never> {
    return new Issue<never>(this.#name, undefined, this.#partsOf(message));
  }

  // Without a message, the issue repeats the hint of its code.
  #partsOf(message = this.#hint): Parts {
    return { kind: this.#kind, message, hint: this.#hint };
  }
}
