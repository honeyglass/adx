/**
 * The call that lists the values of a field, which adx derives for a field with a source.
 *
 * listStep: the step to that call, carrying the fields of the call it answers.
 * optionText: how a message names the field, by its option, or by name for a field of --json.
 *
 * A key of a list is listed by the list command; any other source by the field's own option
 * given without a value (rule 13). The step carries the fields of the call that its command has
 * under the same name (decision 52), but never the listed field itself.
 *
 * @example issue.command(listStep(command, 'lang', known.given));
 */
import { commandStep } from "../core/index.js";
import { refOf } from "./ref.js";
/**
 * @param command - the command whose field it is
 * @param field - the field
 * @param given - the input of the call as its caller gave it
 * @returns the step, or undefined for a field without a source
 */
export function listStep(command, field, given) {
    const source = command.sourceOf(field);
    if (source === undefined)
        return undefined;
    const call = Object.fromEntries(Object.entries(given).filter(([key]) => key !== field));
    const ref = refOf(source);
    if (ref !== undefined)
        return ref.list.step(call);
    return commandStep(command, call).lists(field);
}
export function optionText(command, field) {
    const option = command.fields().find(one => one.field === field)?.option;
    return option === undefined ? field : `--${option}`;
}
