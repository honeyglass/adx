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
export function textOf(answer, shown) {
    const text = answer.ok
        ? `${successText(answer, shown)}${nextText(answer.next ?? [])}`
        : refusalText(answer);
    return text.replace(CONTROL, escaped);
}
const escaped = (char) => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`;
// A record with fields prints them, one on a line; an effect says whether it applied, beside
// those fields, or below any other text.
function successText(answer, shown) {
    const { result } = answer;
    const applied = answer.applied === undefined ? {} : { applied: answer.applied };
    if (shown !== undefined)
        return `${lineOf(shown(result))}${fieldsText(applied)}`;
    if (isRecord(result) && Object.keys(result).length > 0) {
        return fieldsText({ ...result, ...applied });
    }
    return `${resultText(result)}${fieldsText(applied)}`;
}
// A text that does not end its last line gets the line break the terminal needs.
const lineOf = (text) => (text === '' || text.endsWith('\n') ? text : `${text}\n`);
// No result prints nothing, as the JSON leaves it out; any other value prints as its JSON.
const resultText = (result) => (result === undefined ? '' : `${valueText(result)}\n`);
function fieldsText(record) {
    const keys = Object.keys(record);
    if (keys.length === 0)
        return '';
    const width = Math.max(...keys.map(key => key.length)) + GAP;
    return keys.map(key => `${key.padEnd(width)}${valueText(record[key])}\n`).join('');
}
const valueText = (value) => (typeof value === 'string' ? value : JSON.stringify(value));
// A step for the person has no command, so what it does stands alone. A line break or a tab in a
// value would break the columns, so both are escaped here, as every other control character is.
function nextText(next) {
    if (next.length === 0)
        return '';
    const rows = next.map(({ does, command, needs }) => {
        if (command === undefined)
            return [oneLine(does), ''];
        const right = needs === undefined ? does : `${does}; needs ${needs.join(', ')}`;
        return [oneLine(command), oneLine(right)];
    });
    return `\nNext:\n${columns(rows)}`;
}
const oneLine = (text) => text.replace(/[\n\t]/g, escaped);
/**
 * @param rows - the first column and the second of each row
 * @returns one indented line per row, the first column padded to the longest
 */
export function columns(rows) {
    const width = Math.max(0, ...rows.map(([left]) => left.length)) + COLUMN_GAP;
    return rows.map(([left, right]) => `  ${left.padEnd(width)}${right}`.trimEnd() + '\n').join('');
}
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
function refusalText(answer) {
    const head = `refused (${answer.kind}): ${answer.state}`;
    const blocks = (answer.issues ?? []).map(issueText);
    return `${[head, ...blocks].join('\n\n')}\n`;
}
function issueText(issue) {
    const at = issue.path === undefined ? issue.code : `${issue.code} at ${issue.path}`;
    const lines = [at, `  ${issue.message}`, `  hint  ${issue.hint}`];
    if (issue.command !== undefined)
        lines.push(`  run   ${issue.command}`);
    return lines.join('\n');
}
