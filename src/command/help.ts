/**
 * The answer of --help: what a command takes, made from its declaration, as facts and as text.
 *
 * AdxOption, Help: an option adx gives a command, with what it does, and what help reads.
 * helpOf: the facts, and the text a person at a terminal reads.
 * helpFacts: the facts alone, which `schema <command>` shows too.
 *
 * There is no help text to write: the words, `does`, the fields with their `.describe()`, the
 * options of adx and the example all come from the command.
 *
 * @example return helpOf({ command: 'hello greet', does, fields, options, example });
 */
import type { Answered } from './answered.ts';
import { optionName } from './argv.ts';
import type { FieldOf, Takes } from './input.ts';

export type AdxOption = { option: string; takes: Takes; does: string };

export type Help = {
  /** The words of the call, the tool's name first. */
  command: string;
  does: string;
  fields: readonly FieldOf[];
  options: readonly AdxOption[];
  example: unknown;
};

/** Two spaces between the longest option and its text. */
const GAP = 2;

export function helpOf(help: Help): Answered {
  return { answer: { ok: true, result: helpFacts(help) }, text: () => textOf(help) };
}

export function helpFacts(help: Help) {
  return {
    command: help.command,
    does: help.does,
    fields: help.fields.map(fieldFacts),
    options: help.options,
    ...(help.example === undefined ? {} : { example: help.example }),
  };
}

// A field of --json only has no option.
function fieldFacts(field: FieldOf) {
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

function textOf(help: Help) {
  const rows = [...help.fields.map(fieldRow), ...help.options.map(optionRow)];
  const width = Math.max(...rows.map(([left]) => left.length)) + GAP;
  const lines = rows.map(([left, right]) => `  ${left.padEnd(width)}${right}`.trimEnd());
  const example =
    help.example === undefined ? [] : ['', `example  ${JSON.stringify(help.example)}`];
  return [`${help.command}: ${help.does}`, '', ...lines, ...example, ''].join('\n');
}

function fieldRow(field: FieldOf): [string, string] {
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

const optionRow = (option: AdxOption): [string, string] => [
  usageOf(option.option, option.takes),
  option.does,
];

const usageOf = (option: string, takes: Takes) =>
  takes === 'switch' ? option : `${option} <${takes}>`;

const optionOf = (field: string) => `--${optionName(field)}`;
