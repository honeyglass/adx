/**
 * The answer of an option given without its value: the option, and what it lists (rule 13).
 *
 * listedAnswer: the values it takes, or the names a fresh source has taken, with their text.
 *
 * --fields alone and the option of a field with a source answer alike, so an agent reads both
 * the same way.
 *
 * @example return listedAnswer('lang', { values: [{ value: 'en' }, { value: 'de' }] });
 */
import { oneLine } from "../core/index.js";
/** The longer label, option, and two spaces, so both values start in one column. */
const WIDTH = 8;
/**
 * @param option - the option without its dashes, such as home-town
 * @param listed - the values the option takes, or the names already taken
 * @returns the answer, and its text: the option, then the values on one line, each line break
 * in a value escaped
 */
export function listedAnswer(option, listed) {
    const [label, words] = 'values' in listed
        ? ['values', listed.values.map(choice => choice.value)]
        : ['taken', listed.taken];
    return {
        answer: { ok: true, result: { option, ...listed } },
        text: () => `${'option'.padEnd(WIDTH)}${option}\n${label.padEnd(WIDTH)}${oneLine(words.join(', '))}\n`,
    };
}
