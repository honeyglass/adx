/**
 * The input of a call that comes in whole with --json, beside the fields its options gave.
 *
 * jsonInput: one object of both, or an issue for a text that is no JSON object, for each field
 * both gave and for each key named __proto__; `--json -` reads the text from stdin.
 *
 * Both fill the same object, so an agent can append --json to a command the tool proposed. A
 * field given twice is refused, never decided by order. The text is no JSON for `-`, so the
 * value means stdin and nothing else. JSON.parse keeps a key named __proto__ as a field, which
 * Zod drops from a record without a word, so it is refused wherever it stands.
 *
 * @example const { input, issues } = await jsonInput({ name: 'Ada' }, '{"lang":"de"}', stdin);
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { codePointsIn, inputTooLarge, invalidJson, missingInput, repeatedOption, schemaFailed, STDIN_LIMIT, } from "../core/index.js";
/** The value of --json that reads the object from stdin. */
const FROM_STDIN = '-';
/**
 * The one key JSON.parse keeps that an object cannot hold as a plain field. A definition, from
 * ECMAScript (the `__proto__` accessor of Object.prototype, Annex B): no property of the input
 * closes it, since Zod builds its output as plain objects, where the key sets the prototype.
 */
const PROTO = '__proto__';
/**
 * @param given - the fields the options of the call gave
 * @param value - the value of --json
 * @param stdin - what the call reads from stdin, read only for `-`; none for a call that runs
 * nothing, such as --help
 * @returns the input of both, and the issues
 */
export async function jsonInput(given, value, stdin) {
    if (value !== FROM_STDIN)
        return withJson(given, value, '--json');
    if (stdin === undefined)
        return { input: given, issues: [] };
    const piped = await stdin();
    if (piped === null || ('text' in piped && piped.text.trim() === '')) {
        return refused(missingInput.at('json', '--json - reads stdin, and nothing is piped in'));
    }
    if ('utf8' in piped)
        return refused(invalidJson.at('json', 'stdin holds bytes that are no UTF-8'));
    if (codePointsIn(piped.text) > STDIN_LIMIT) {
        const message = `stdin holds more than ${STDIN_LIMIT} characters`;
        return refused(inputTooLarge.at('json', message));
    }
    return withJson(given, piped.text, 'stdin');
}
function withJson(given, text, source) {
    const parsed = trySync$(() => JSON.parse(text));
    if (parsed.error !== null) {
        return refused(invalidJson.at('json', `${source} holds no JSON: ${parsed.error.message}`));
    }
    const json = parsed.data;
    if (isRecord(json) === false)
        return refused(invalidJson.at('json', `${source} holds no JSON object`));
    const protos = protoPaths(json, []).map(([field, ...below]) => schemaFailed.at([field, ...below], `the input has no field ${PROTO}`));
    const twice = Object.keys(json).filter(key => Object.hasOwn(given, key));
    const issues = twice.map(key => repeatedOption.at(key, `${key} came as an option and in --json`));
    return { input: { ...given, ...json }, issues: [...protos, ...issues] };
}
// Each place of a key named __proto__, the field of the input first.
function protoPaths(value, path) {
    const entries = Array.isArray(value)
        ? value.map((item, index) => [index, item])
        : isRecord(value)
            ? Object.entries(value)
            : [];
    return entries.flatMap(([key, item]) => {
        const at = [...path, key];
        const [field, ...below] = at;
        const own = key === PROTO && typeof field === 'string' ? [[field, ...below]] : [];
        return [...own, ...protoPaths(item, at)];
    });
}
const refused = (issue) => ({ input: {}, issues: [issue] });
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
