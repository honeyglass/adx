/**
 * The refusal of the fields a list needs first: one MISSING_VALUE issue per field (decision 27).
 *
 * missingIssues: the issues, each naming the call that lists its field's values.
 *
 * adx names a command only when it runs as it stands. A field whose own list needs another
 * missing field gets no command, and its hint names the field to give first (decision 44).
 *
 * @example const issues = await missingIssues(command, new Map([['project', 'milestone']]), known);
 */
import { missingValue, withHint } from '../core/index.ts';
import type { Issue, Known, Sourced } from '../core/index.ts';
import { asked } from './ask.ts';
import { listStep, optionText } from './liststep.ts';

/**
 * @param command - the command of the call
 * @param needed - each field a list needs first, with the field whose list needs it
 * @param known - the input of the call
 * @returns one issue per needed field, in the order of the map
 */
export function missingIssues(
  command: Sourced,
  needed: ReadonlyMap<string, string>,
  known: Known,
): Promise<Issue[]> {
  const each = [...needed].map(async ([field, by]) => {
    const message = `the values of ${optionText(command, by)} need ${optionText(command, field)}`;
    const issue = missingValue.at(field, message);
    const own = await asked(field, command.sourceOf(field), known.checked);
    if (own.kind === 'needs') return firstNeeded(command, issue, field, own.fields);
    const step = listStep(command, field, known.given);
    return step === undefined ? issue : issue.command(step);
  });
  return Promise.all(each);
}

// A step without a command keeps the tool's hint and a derived command away from the issue.
function firstNeeded(command: Sourced, issue: Issue, field: string, first: readonly string[]) {
  const names = first.map(name => optionText(command, name)).join(' and ');
  const hint = `Give ${names} first: the values of ${optionText(command, field)} depend on it`;
  return withHint(issue.command({ does: `gives ${names} first` }), hint);
}
