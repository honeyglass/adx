/**
 * A command that reads: its input checked against its schema, then its handler run.
 *
 * Obj, ReadSpec: a Zod object, and what read() takes.
 * Command: the value read() returns; invoke answers one call with typed input.
 * answererOf: the answer of a command for the tool, which lets every error reach its own catch.
 *
 * This is the one file of command/ that reads Zod, so a change of Zod touches one file.
 *
 * @example const answer = await greet.invoke({ name: 'Ada' });
 */
import type { z } from 'zod';
import { $try } from '@honeyglass/utils/ts';
import {
  answerOfError,
  NOTHING_CHANGED,
  refusalAnswer,
  Refused,
  refusedWith,
  schemaFailed,
} from '../core/index.ts';
import type { Answer, Issue, Path } from '../core/index.ts';

export type Obj = z.ZodObject;

export type ReadSpec<I extends Obj, O> = {
  does: string;
  input: I;
  example?: z.input<I>;
  run: (input: z.output<I>) => O | Promise<O>;
};

type Answerer = (input: object) => Promise<Answer<unknown>>;

/**
 * The tool answers a command through this table and not through invoke: invoke answers a bug
 * itself, while the tool also writes the bug's error to stderr.
 */
const answerers = new WeakMap<object, Answerer>();

/**
 * @param entry - a value of the command table
 * @returns its answerer, which rejects on every error, or undefined for a value read() did not make
 */
export const answererOf = (entry: object) => answerers.get(entry);

export class Command<I extends Obj, O> {
  readonly #spec: ReadSpec<I, O>;

  constructor(spec: ReadSpec<I, O>) {
    this.#spec = spec;
    answerers.set(this, input => this.#answered(input));
  }

  /** Answers as the tool prints it: a refusal and a bug resolve as an answer, never reject. */
  async invoke(input: z.input<I>): Promise<Answer<O>> {
    const { data, error } = await $try(() => this.#answered(input));
    return error === null ? data : answerOfError(error).answer;
  }

  /**
   * A field the schema does not name is refused, never dropped, and the handler runs only on an
   * input that passed. A refusal the handler returns is thrown, as one it throws.
   */
  async #answered(input: object): Promise<Answer<O>> {
    const parsed = this.#spec.input.safeParse(input);
    const unnamed = unnamedIssues(this.#spec.input, input);
    if (parsed.success && unnamed.length === 0) {
      const result = await this.#spec.run(parsed.data);
      if (result instanceof Refused) throw result;
      return { ok: true, result };
    }
    const failed = parsed.success ? [] : parsed.error.issues;
    const [first, ...rest] = [...unnamed, ...failed.map(i => schemaIssue(i.path, i.message))];
    return refusalAnswer(refusedWith([first, ...rest], NOTHING_CHANGED));
  }
}

function unnamedIssues(schema: Obj, input: object) {
  return Object.keys(input)
    .filter(key => Object.hasOwn(schema.shape, key) === false)
    .map(key => schemaFailed.at(key, `the input has no field ${key}`));
}

// An issue at the root of the input names no field, so it has no path.
function schemaIssue(path: readonly PropertyKey[], message: string): Issue {
  const [field, ...below] = path;
  if (typeof field !== 'string') return schemaFailed.issue(message);
  const parts: Path<string> = [field, ...below.filter(part => typeof part !== 'symbol')];
  return schemaFailed.at(parts, message);
}
