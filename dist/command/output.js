/**
 * --output of every call: the form of the answer, text or JSON, whatever stdout is.
 *
 * Form, formOf: the two forms, and the tokens of a call without --output, with the form it
 * forces, its values when it came alone, or an issue per mistake in it.
 *
 * The form is no part of a command, so --output is taken out before the words are routed, and
 * the start answer, a group, `schema` and every command take it alike. Its value stands in an
 * allow-list: any other value is refused, so the call never falls back to the other form without
 * saying so. Given without a value as the whole call, `tool --output`, it lists its values (rule
 * 13); without a value beside anything else, it is refused and names that call.
 *
 * @example const read = formOf(around.tokens, shell.name);
 */
import { missingValue, notInListAt, repeatedOption } from "../core/index.js";
import { listedAnswer } from "./listed.js";
const FORMS = [
    { value: 'text', does: 'text for a person' },
    { value: 'json', does: 'one JSON document for a program' },
];
const OPTION = 'output';
/**
 * @param tokens - every token of the call
 * @param tool - the name of the tool, the first word of the call that lists the forms
 * @returns the tokens without --output and its value, and the form it forces; or the answer
 * that lists the forms; or the issues of a value outside the list and of a second --output
 */
export function formOf(tokens, tool) {
    const { rest, values } = taken(tokens);
    if (values.length === 0)
        return { tokens: rest, form: undefined };
    const [value, ...more] = values;
    const [issue, ...issues] = [
        ...(value === undefined || isForm(value) ? [] : [outside(value, tool)]),
        ...(value === undefined && rest.length > 0 ? [alone(tool)] : []),
        ...more.map(() => repeatedOption.at(OPTION, `--${OPTION} came twice`)),
    ];
    if (issue !== undefined)
        return { issues: [issue, ...issues] };
    if (value !== undefined && isForm(value))
        return { tokens: rest, form: value };
    return { answered: listedAnswer(OPTION, { values: FORMS }) };
}
// An --output without `=` takes the next word as its value; with none it came alone.
function taken(tokens) {
    const rest = [];
    const values = [];
    let waiting = false;
    for (const token of tokens) {
        if (waiting && token.kind === 'positional') {
            values.push(token.value);
            waiting = false;
            continue;
        }
        if (waiting)
            values.push(undefined);
        waiting = token.kind === 'option' && token.name === OPTION && token.inlineValue !== true;
        if (token.kind === 'option' && token.name === OPTION && waiting === false) {
            values.push(token.value ?? '');
        }
        if (token.kind !== 'option' || token.name !== OPTION)
            rest.push(token);
    }
    if (waiting)
        values.push(undefined);
    return { rest, values };
}
const listing = (tool) => ({
    does: 'lists the forms of the answer',
    command: `${tool} --${OPTION}`,
});
const outside = (value, tool) => notInListAt([OPTION], value).command(listing(tool));
// A call that lists the forms asks nothing else, as an option of a field that lists its values.
const alone = (tool) => missingValue
    .at(OPTION, `--${OPTION} came without a value, and the call asks more than its forms`)
    .command(listing(tool));
const isForm = (value) => FORMS.some(form => form.value === value);
