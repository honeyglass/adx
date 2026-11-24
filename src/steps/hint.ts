/**
 * The command that helps with a code, given where the tool is put together.
 *
 * Hint, hint: the command for every issue of one code, for a command its folder does not import.
 * hintFor: the step of the hint for a code, by the name an issue carries.
 * codeOf: the name of the code a hint stands for, so the tool finds two hints for one code.
 *
 * The function gets nothing, so adx can call it without a call. Nothing is checked when hint()
 * is called, since a tool makes its hints when its files load.
 *
 * @example hint(frozen, () => envs.step()),
 */
import type { Code, CommandStep, Step } from '../core/index.ts';

declare const helps: unique symbol;

export interface Hint {
  readonly [helps]: Code;
}

type Helping = { code: string; step: () => Step };

const helping = new WeakMap<object, Helping>();

/**
 * @param code - a code the tool declared with code()
 * @param step - the step to the command that helps; a step from tell has no command
 * @returns the hint, which the tool takes in `hints`
 */
export function hint(code: Code, step: () => CommandStep<never>): Hint {
  const made = new Helped();
  // An issue of the code carries its name, the one every issue of a refusal names.
  helping.set(made, { code: code.issue().code, step });
  return made;
}

class Helped implements Hint {
  declare readonly [helps]: Code;
}

/** @returns the name of the code the hint stands for, or undefined for any other value */
export const codeOf = (made: Hint) => helping.get(made)?.code;

/**
 * @param hints - the hints of the tool, at most one per code, as the start checks
 * @param code - the code of an issue
 * @returns the step of the hint for the code, or undefined when none stands for it
 */
export function hintFor(hints: readonly Hint[], code: string) {
  const found = hints.map(made => helping.get(made)).find(helped => helped?.code === code);
  return found?.step();
}
