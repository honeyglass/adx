/**
 * The fields a call gives in its arguments after the command word, as `--name value` pairs.
 *
 * givenOf: the given fields, and an issue for each word that fits no pair.
 *
 * Every mistake is collected and reading goes on, so one answer names them all.
 *
 * @example const { given, issues } = givenOf(['--name', 'Ada']);
 */
import { missingValue, unexpectedArgument } from '../core/index.ts';
import type { Issue } from '../core/index.ts';

/**
 * @param words - the arguments after the command word
 * @returns each option with its value, and the issues of the words that fit no pair
 */
export function givenOf(words: readonly string[]) {
  const given = new Map<string, string>();
  const issues: Issue[] = [];
  let option: string | undefined;
  for (const word of words) {
    if (word.startsWith('--')) {
      if (option !== undefined) issues.push(missingValue.at(option));
      option = word.slice(2);
      continue;
    }
    if (option === undefined) {
      issues.push(unexpectedArgument.at(word));
      continue;
    }
    given.set(option, word);
    option = undefined;
  }
  if (option !== undefined) issues.push(missingValue.at(option));
  // fromEntries defines each field as an own property, so a field named __proto__ stays a field.
  return { given: Object.fromEntries(given), issues };
}
