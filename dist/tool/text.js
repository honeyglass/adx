/** Two spaces between the longest field name and its value. */
const GAP = 2;
/** A control character, C0, DEL and C1, by its Unicode category Cc, but the line break and tab. */
const CONTROL = /(?![\n\t])\p{Cc}/gu;
export function textOf(answer) {
    const text = answer.ok ? resultText(answer.result) : refusalText(answer);
    return text.replace(CONTROL, char => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`);
}
// No result prints nothing, as the JSON leaves it out; a record with fields prints them, one on
// a line, and every other value prints as its JSON.
function resultText(result) {
    if (result === undefined)
        return '';
    if (isRecord(result) && Object.keys(result).length > 0)
        return fieldsText(result);
    return `${valueText(result)}\n`;
}
function fieldsText(record) {
    const keys = Object.keys(record);
    const width = Math.max(...keys.map(key => key.length)) + GAP;
    return keys.map(key => `${key.padEnd(width)}${valueText(record[key])}\n`).join('');
}
const valueText = (value) => (typeof value === 'string' ? value : JSON.stringify(value));
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
