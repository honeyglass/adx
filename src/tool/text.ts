/**
 * The terminal form of an answer, for a person at a terminal.
 *
 * textOf: a result as one field on a line or as the command's own text, whether an effect
 * applied, the next steps below it, and a refusal as its kind, state and issues.
 * columns: rows of two columns, the first padded, as the start answer and the steps show them.
 *
 * The text leaves for the terminal here, so here every control character is escaped, in a
 * message, a path and a result alike: a terminal runs an escape sequence it is sent. Only the line
 * break and the tab stay, since the layout needs them.
 *
 * @example process.stdout.write(textOf(answer));
 */
import { escaped, oneLine } from '../core/index.ts';
import type { Answer } from '../core/index.ts';

type AnswerIssue = NonNullable<Answer<unknown>['issues']>[number];

type NextStep = NonNullable<Answer<unknown>['next']>[number];

/** Two spaces between the longest field name and its value. */
const GAP = 2;

/** Three spaces between the longest command and what it does, as the guide's start answer shows. */
const COLUMN_GAP = 3;

/** A control character, C0, DEL and C1, by its Unicode category Cc, but the line break and tab. */
const CONTROL = /(?![\n\t])\p{Cc}/gu;

/**
 * @param answer - the answer of the call
 * @param shown - the command's own text of its result, if it has one
 * @returns the text for the terminal, every control character escaped
 */
export function textOf(answer: Answer<unknown>, shown?: (result: unknown) => string) {
  const text = answer.ok
    ? `${successText(answer, shown)}${nextText(answer.next ?? [])}`
    : refusalText(answer);
  return text.replace(CONTROL, escaped);
}

// A record with fields prints them, one on a line; an effect says whether it applied, beside
// those fields, or below any other text.
function successText(answer: Answer<unknown>, shown: ((result: unknown) => string) | undefined) {
  const { result } = answer;
  const applied = answer.applied === undefined ? {} : { applied: answer.applied };
  if (shown !== undefined) return `${lineOf(shown(result))}${fieldsText(applied)}`;
  if (isRecord(result) && Object.keys(result).length > 0) {
    return fieldsText({ ...result, ...applied });
  }
  return `${resultText(result)}${fieldsText(applied)}`;
}

// A text that does not end its last line gets the line break the terminal needs.
const lineOf = (text: string) => (text === '' || text.endsWith('\n') ? text : `${text}\n`);

// No result prints nothing, as the JSON leaves it out; any other value prints as its JSON.
const resultText = (result: unknown) => (result === undefined ? '' : `${valueText(result)}\n`);

function fieldsText(record: Record<string, unknown>) {
  const keys = Object.keys(record);
  if (keys.length === 0) return '';
  const width = Math.max(...keys.map(key => key.length)) + GAP;
  return keys.map(key => `${key.padEnd(width)}${valueText(record[key])}\n`).join('');
}

const valueText = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

// A step for the person has no command, so what it does stands alone. A line break or a tab in a
// value would break the columns, so both are escaped here, as every other control character is.
function nextText(next: readonly NextStep[]) {
  if (next.length === 0) return '';
  const rows = next.map(({ does, command, needs }): [string, string] => {
    if (command === undefined) return [oneLine(does), ''];
    const right = needs === undefined ? does : `${does}; needs ${needs.join(', ')}`;
    return [oneLine(command), oneLine(right)];
  });
  return `\nNext:\n${columns(rows)}`;
}

/**
 * @param rows - the first column and the second of each row
 * @returns one indented line per row, the first column padded to the longest
 */
export function columns(rows: readonly [string, string][]) {
  const width = Math.max(0, ...rows.map(([left]) => left.length)) + COLUMN_GAP;
  return rows.map(([left, right]) => `  ${left.padEnd(width)}${right}`.trimEnd() + '\n').join('');
}

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
