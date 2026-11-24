/**
 * The tokens of a call after its command words, checked one by one against the command's options.
 *
 * Option: one option a command takes, of a field or of adx.
 * Read, argumentsOf: the fields the options give, the values of adx's options, and an issue per
 * mistake.
 * optionName: the option of a field, its name in kebab case: dueDate is due-date.
 *
 * Every mistake is collected and reading goes on, so one answer names them all. An option
 * without `=` takes the next word as its value, unless it is a switch; an option followed by
 * another option, or by nothing, came without a value. An option nobody lists takes its value
 * too, so the answer names it and the word does not count as a stray one.
 *
 * @example const read = argumentsOf(tokens, options, { command: 'greet', listable: new Set() });
 */
import { missingValue, repeatedOption, unexpectedArgument, unexpectedValue, unknownOption, } from "../core/index.js";
/**
 * @param tokens - the tokens after the command words
 * @param options - every option the command takes, by its name without dashes
 * @param call - the words of the command, for the messages, and the options that may come alone
 * @returns what the options give, which listable option came alone, and the issues in the order
 * of the tokens
 */
export function argumentsOf(tokens, options, call) {
    const read = { given: {}, adx: {}, listed: undefined, seen: new Set(), issues: [] };
    let waiting;
    for (const token of tokens) {
        if (token.kind === 'positional' && waiting !== undefined) {
            valued(read, waiting, token.value, call);
            waiting = undefined;
            continue;
        }
        if (waiting !== undefined)
            alone(read, waiting, call);
        waiting =
            token.kind === 'option' ? opened(read, token, options.get(token.name), call) : undefined;
        if (token.kind === 'positional')
            read.issues.push(strayWord(token.value, call));
        if (token.kind === 'option-terminator')
            read.issues.push(strayWord('--', call));
    }
    if (waiting !== undefined)
        alone(read, waiting, call);
    return read;
}
// The option of a token, set at once when it needs no word after it, else waiting for one.
function opened(read, token, option, call) {
    const waiting = { option, token };
    if (option?.takes === 'switch') {
        if (token.inlineValue === true) {
            const message = `${token.rawName} is a switch and takes no value`;
            read.issues.push(unexpectedValue.at(pathOf(waiting), message));
            return undefined;
        }
        set(read, option, true, token);
        return undefined;
    }
    if (token.inlineValue !== true)
        return waiting;
    valued(read, waiting, token.value ?? '', call);
    return undefined;
}
function valued(read, waiting, value, call) {
    const { option, token } = waiting;
    if (option === undefined) {
        const message = `${call.command} has no option ${token.rawName} (its value was ${value})`;
        read.issues.push(unknownOption.at(pathOf(waiting), message));
        return;
    }
    set(read, option, option.takes === 'number' ? numberOf(value) : value, token);
}
function alone(read, waiting, call) {
    const { option, token } = waiting;
    if (option === undefined) {
        const message = `${call.command} has no option ${token.rawName}`;
        read.issues.push(unknownOption.at(pathOf(waiting), message));
        return;
    }
    if (call.listable.has(option.name)) {
        if (once(read, option, token))
            read.listed ??= option.name;
        return;
    }
    const message = `${token.rawName} came without a value`;
    read.issues.push(missingValue.at(pathOf(waiting), message));
}
// An option of an array field collects its values in their order.
function set(read, option, value, token) {
    if (once(read, option, token) === false)
        return;
    const into = option.field === undefined ? read.adx : read.given;
    const key = option.field ?? option.name;
    const before = Object.hasOwn(into, key) ? into[key] : undefined;
    into[key] = option.repeats ? [...(Array.isArray(before) ? before : []), value] : value;
}
// Only an option of an array field may come again, with a value or alone.
function once(read, option, token) {
    if (option.repeats)
        return true;
    if (read.seen.has(option.name) === false) {
        read.seen.add(option.name);
        return true;
    }
    const path = option.field ?? option.name;
    read.issues.push(repeatedOption.at(path, `${token.rawName} came twice`));
    return false;
}
const strayWord = (word, call) => unexpectedArgument.at(word, `${call.command} takes no word after its options`);
// An issue at an option stands at its field, or at the option's name as the call wrote it.
const pathOf = ({ option, token }) => option?.field ?? token.name;
/** A plain decimal number: a sign, digits, and a fraction; adx reads no other form, never guesses. */
const DECIMAL = /^[+-]?\d+(\.\d+)?$/;
// A text that is no plain decimal number stays a text, so the schema refuses it.
const numberOf = (text) => (DECIMAL.test(text) ? Number(text) : text);
/**
 * A run of capitals is one word, so baseURL is base-url and Name is name (decision 51).
 *
 * @param field - the name of a field
 * @returns the name of its option in kebab case, without the dashes
 */
export const optionName = (field) => field
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
