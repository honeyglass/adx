import { optionName } from "./argv.js";
/** Two spaces between the longest option and its text. */
const GAP = 2;
export function helpOf(help) {
    return { answer: { ok: true, result: helpFacts(help) }, text: () => textOf(help) };
}
export function helpFacts(help) {
    return {
        command: help.command,
        does: help.does,
        fields: help.fields.map(fieldFacts),
        options: help.options,
        ...(help.example === undefined ? {} : { example: help.example }),
    };
}
// A field of --json only has no option.
function fieldFacts(field) {
    return {
        field: field.field,
        ...(field.takes === 'json' ? {} : { option: optionOf(field.field) }),
        takes: field.takes,
        ...(field.does === undefined ? {} : { does: field.does }),
        ...(field.required ? { required: true } : {}),
        ...(field.default === undefined ? {} : { default: field.default }),
        ...(field.repeats ? { repeats: true } : {}),
    };
}
function textOf(help) {
    const rows = [...help.fields.map(fieldRow), ...help.options.map(optionRow)];
    const width = Math.max(...rows.map(([left]) => left.length)) + GAP;
    const lines = rows.map(([left, right]) => `  ${left.padEnd(width)}${right}`.trimEnd());
    const example = help.example === undefined ? [] : ['', `example  ${JSON.stringify(help.example)}`];
    return [`${help.command}: ${help.does}`, '', ...lines, ...example, ''].join('\n');
}
function fieldRow(field) {
    const notes = [
        field.does,
        field.required ? 'required' : undefined,
        field.default === undefined ? undefined : `default ${JSON.stringify(field.default)}`,
        field.repeats ? 'again for more' : undefined,
        field.takes === 'json' ? 'only in --json' : undefined,
    ];
    const left = field.takes === 'json' ? field.field : usageOf(optionOf(field.field), field.takes);
    return [left, notes.filter(note => note !== undefined).join('; ')];
}
const optionRow = (option) => [
    usageOf(option.option, option.takes),
    option.does,
];
const usageOf = (option, takes) => takes === 'switch' ? option : `${option} <${takes}>`;
const optionOf = (field) => `--${optionName(field)}`;
