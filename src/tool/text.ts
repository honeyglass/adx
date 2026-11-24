/**
 * The terminal form of an answer, for a person at a terminal.
 *
 * textOf: a result as one field on a line, a refusal as its kind, state and issues.
 *
 * The text leaves for the terminal here, so here every control character is escaped, in a
 * message, a path and a result alike: a terminal runs an escape sequence it is sent. Only the line
 * break and the tab stay, since the layout needs them.
 *
 * @example process.stdout.write(textOf(answer));
 */
import type { Answer } from '../core/index.ts';

type AnswerIssue = NonNullable<Answer<unknown>['issues']>[number];

/** Two spaces between the longest field name and its value. */
const GAP = 2;

/** A control character, C0, DEL and C1, by its Unicode category Cc, but the line break and tab. */
const CONTROL = /(?![\n\t])\p{Cc}/gu;

export function textOf(answer: Answer<unknown>) {
  const text = answer.ok ? resultText(answer.result) : refusalText(answer);
  return text.replace(CONTROL, char => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`);
}

// No result prints nothing, as the JSON leaves it out; a record with fields prints them, one on
// a line, and every other value prints as its JSON.
function resultText(result: unknown) {
  if (result === undefined) return '';
  if (isRecord(result) && Object.keys(result).length > 0) return fieldsText(result);
  return `${valueText(result)}\n`;
}

function fieldsText(record: Record<string, unknown>) {
  const keys = Object.keys(record);
  const width = Math.max(...keys.map(key => key.length)) + GAP;
  return keys.map(key => `${key.padEnd(width)}${valueText(record[key])}\n`).join('');
}

const valueText = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

function refusalText(answer: Answer<unknown>) {
  const head = `refused (${answer.kind}): ${answer.state}`;
  const blocks = (answer.issues ?? []).map(issueText);
  return `${[head, ...blocks].join('\n\n')}\n`;
}

function issueText(issue: AnswerIssue) {
  const at = issue.path === undefined ? issue.code : `${issue.code} at ${issue.path}`;
  const lines = [at, `  ${issue.message}`, `  hint  ${issue.hint}`];
  if (issue.command !== undefined) lines.push(`  run   ${issue.command}`);
  return lines.join('\n');
}
