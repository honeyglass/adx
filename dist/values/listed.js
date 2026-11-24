/**
 * The answer of an option given without its value: the values it takes (rule 13).
 *
 * listed: the values of a source, the names a fresh source has taken, or the refusal that names
 * what the list needs first.
 *
 * A key of a list names the list instead, since its keys may be too many to print, or lie on a
 * server: the field came without a value, and the issue names the call that lists them. The
 * other values of the call stand in their own lists first, so the source gets only those.
 *
 * @example const answer = await listed(command, 'lang', { given, checked });
 */
import { missingValue } from "../core/index.js";
import { asked } from "./ask.js";
import { listStep, optionText } from "./liststep.js";
import { missingIssues } from "./missing.js";
import { judged } from "./outside.js";
export async function listed(command, field, called) {
    const { issues, accepted } = await judged(command, called);
    const [wrong, ...others] = issues;
    if (wrong !== undefined)
        return { issues: [wrong, ...others] };
    const known = { given: called.given, checked: accepted };
    const answer = await asked(field, command.sourceOf(field), known.checked);
    switch (answer.kind) {
        case 'choices':
            return { values: answer.choices };
        case 'taken':
            return { taken: answer.names };
        case 'needs': {
            const needed = new Map(answer.fields.map(name => [name, field]));
            const [first, ...rest] = await missingIssues(command, needed, known);
            return first === undefined ? { values: [] } : { issues: [first, ...rest] };
        }
        default:
            return { issues: [withoutValue(command, field, known)] };
    }
}
// The list of a key names the call that lists its keys; a field without a source names none.
function withoutValue(command, field, known) {
    const issue = missingValue.at(field, `${optionText(command, field)} came without a value`);
    const step = listStep(command, field, known.given);
    return step === undefined ? issue : issue.command(step);
}
