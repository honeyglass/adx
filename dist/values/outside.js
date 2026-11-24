/**
 * The values of a call checked against the lists of their sources, after the schema passed.
 *
 * judged, outside: one NOT_IN_LIST issue per value outside its list, one MISSING_VALUE issue per
 * field a list needs first, and the fields that passed, which a source may get.
 * isListed: whether a list holds a value.
 *
 * A source gets a value of another field only once that value stands in its own list, so a
 * value outside its list never reaches a source, nor a server behind it. Fields are judged in
 * rounds: a source that needs a given field not judged yet waits for it, and one that waits for
 * a refused value is not asked again, since that value's issue already names the mistake.
 *
 * Only a field the caller gave is checked: a default is the tool's own choice. A value of a
 * field that holds a list is checked one by one, and an issue stands at its index. A fresh
 * source and a key of a list refuse nothing here.
 *
 * @example const issues = await outside(command, { given, checked: input });
 */
import { notInListAt } from "../core/index.js";
import { asked } from "./ask.js";
import { listStep } from "./liststep.js";
import { missingIssues } from "./missing.js";
/** @returns the issues of the values a call gave; none when every value stands in its list */
export async function outside(command, known) {
    return (await judged(command, known)).issues;
}
/**
 * @param command - the command of the call
 * @param known - the input of the call
 * @returns the issues, and the checked input without a value outside its list
 */
export async function judged(command, known) {
    const open = new Set(command
        .fields()
        .map(({ field }) => field)
        .filter(field => Object.hasOwn(known.given, field) && command.sourceOf(field) !== undefined));
    const accepted = Object.fromEntries(Object.entries(known.checked).filter(([field]) => open.has(field) === false));
    const issues = [];
    const needed = new Map();
    let progress = true;
    while (open.size > 0 && progress) {
        progress = false;
        for (const field of [...open]) {
            const answer = await asked(field, command.sourceOf(field), accepted);
            const names = answer.kind === 'needs' ? answer.fields : [];
            if (names.some(name => open.has(name)))
                continue;
            open.delete(field);
            progress = true;
            for (const name of names) {
                if (Object.hasOwn(known.given, name) || needed.has(name))
                    continue;
                needed.set(name, field);
            }
            const wrong = answer.kind === 'choices' ? outsideOf(command, field, known, answer.choices) : [];
            issues.push(...wrong);
            if (names.length === 0 && wrong.length === 0)
                accepted[field] = known.checked[field];
        }
    }
    const missing = await missingIssues(command, needed, { given: known.given, checked: accepted });
    return { issues: [...issues, ...missing], accepted };
}
function outsideOf(command, field, known, choices) {
    const value = known.checked[field];
    const placed = Array.isArray(value)
        ? value.map((item, index) => [[field, index], item])
        : [[[field], value]];
    const step = listStep(command, field, known.given);
    return placed
        .filter(([, item]) => isListed(item, choices) === false)
        .map(([path, item]) => {
        const issue = notInListAt(path, item);
        return step === undefined ? issue : issue.command(step);
    });
}
/**
 * A choice is text, so a number stands in its list by its decimal form, and any other value in
 * none.
 *
 * @param value - one value of a field
 * @param choices - the list of the field's source
 * @returns whether the list holds the value
 */
export function isListed(value, choices) {
    const text = typeof value === 'number' ? `${value}` : value;
    return choices.some(choice => choice.value === text);
}
