/**
 * What runs one command: its options, its layers of checks, and its handler.
 *
 * Kind, Place, Run: the three kinds, where a tool lists a command, and what a run is asked for.
 * Runner: answer, a call from its tokens; answered, the same from an input object, for invoke.
 *
 * adx checks in layers: the arguments, then the schema, then `check`, then the handler. Each
 * layer collects all its issues, and a later layer runs only when the earlier ones passed. A
 * refusal the handler returns is thrown, as one it throws, so the tool answers both alike.
 *
 * @example const answered = await runnerOf(greet)?.answer(tokens, []);
 */
import type { z } from 'zod';
import { declaration, NOTHING_CHANGED, Refused, refusedWith, withCommand } from '../core/index.ts';
import type { Issue, Step, Token } from '../core/index.ts';
import { refused } from './answered.ts';
import type { Answered } from './answered.ts';
import { argumentsOf, optionName } from './argv.ts';
import type { Option, Read } from './argv.ts';
import { fieldsListed, namesOf, picked } from './fields.ts';
import { helpOf } from './help.ts';
import type { AdxOption } from './help.ts';
import { answerFieldsOf, fieldsOf, inputOf, parsedBy, sharedWithGlobal } from './input.ts';
import type { FieldOf } from './input.ts';
import { withJson } from './json.ts';
import { PAGE_SIZE } from './limits.ts';
import type { Obj, Spec } from './types.ts';

export type Kind = 'read' | 'list' | 'effect';

/** `tool` is the name of the tool, `words` the words of the command in its table. */
export type Place = { tool: string; words: string };

/** `fields` holds the names --fields gave, if any. */
export type Run = { dryRun: boolean; fields: readonly string[] | undefined };

const JSON_OPTION: AdxOption = {
  option: '--json',
  takes: 'json',
  does: 'the whole input as one JSON object',
};
const HELP_OPTION: AdxOption = {
  option: '--help',
  takes: 'switch',
  does: 'shows what the command takes',
};
const DRY_RUN_OPTION: AdxOption = {
  option: '--dry-run',
  takes: 'switch',
  does: 'runs plan only and changes nothing',
};
const FIELDS_OPTION: AdxOption = {
  option: '--fields',
  takes: 'text',
  does: 'the fields of the answer, each whole; alone, it lists them',
};

/** The options adx gives every command, also those it does not build yet: a field takes none. */
const ALWAYS_TAKEN = ['json', 'output', 'help', 'dry-run', 'replace'];

/** A read with output that the call names no fields of answers all of them. */
const NO_FIELDS: Run = { dryRun: false, fields: undefined };

/** The one refuse of every handler; what was refused stopped before adx changed anything. */
const refuse = (...issues: [Issue, ...Issue[]]) => refusedWith(issues, NOTHING_CHANGED);

export class Runner {
  readonly kind: Kind;
  readonly spec: Spec;
  readonly input: Obj;
  /** Every place a tool lists the command; more than one is a DECLARATION error. */
  readonly places: Place[] = [];
  readonly #global: Obj | undefined;

  constructor(kind: Kind, spec: Spec, global: Obj | undefined) {
    this.kind = kind;
    this.spec = spec;
    this.#global = global;
    this.input = inputOf(spec, global);
  }

  get name() {
    return this.places[0]?.words ?? '';
  }

  /**
   * @param tokens - the tokens of the call after the command words
   * @param before - the issues of the tokens before the command words
   * @returns the answer of the call, and its terminal form
   */
  async answer(tokens: readonly Token[], before: readonly Issue[]): Promise<Answered> {
    const fields = fieldsOf(this.input);
    const read = argumentsOf(tokens, this.#optionsOf(fields), {
      command: this.name,
      listable: new Set(this.#hasFields() ? ['fields'] : []),
    });
    const json =
      typeof read.adx.json === 'string'
        ? withJson(read.given, read.adx.json)
        : { input: read.given, issues: [] };
    const [first, ...rest] = this.#shown([...before, ...read.issues, ...json.issues]);
    if (first !== undefined) return refused([first, ...rest]);
    if (read.adx.help === true) return this.#help(fields);
    const output = this.#output();
    if (output !== undefined) return this.#withFields(json.input, read, output);
    return this.answered(json.input, { dryRun: read.adx['dry-run'] === true, fields: undefined });
  }

  /**
   * @param value - the input of the call, from its options and --json, or from invoke
   * @param run - whether it is a dry run, and the fields the answer keeps
   * @returns the answer; a refusal of the handler and a bug are thrown
   */
  async answered(value: unknown, run: Run): Promise<Answered> {
    const parsed = parsedBy(this.input, value);
    const [failed, ...rest] = this.#shown(parsed.issues);
    if (failed !== undefined) return refused([failed, ...rest]);
    const checked = this.spec.check?.(parsed.data) ?? [];
    const [issue, ...more] = checked;
    if (issue !== undefined) return refused([issue, ...more]);
    if (this.kind === 'effect') return this.#effect(parsed.data, run);
    const page = { cursor: '', size: this.spec.pageSize ?? PAGE_SIZE };
    const result = thrownIfRefused(await this.spec.run?.(parsed.data, { refuse, page }));
    if (run.fields === undefined) return { answer: { ok: true, result }, ...this.#text() };
    // The author's text reads the whole answer; a cut one prints in adx's own form.
    return { answer: { ok: true, result: picked(result, run.fields) } };
  }

  /**
   * @returns one DECLARATION issue per field named like an option adx gives the command, per
   * option two fields would share, and per field the global input would replace
   */
  clashes(): Issue[] {
    const taken = new Set([
      ...ALWAYS_TAKEN,
      ...(this.kind === 'list' ? ['page', 'fields'] : []),
      ...(this.#hasFields() ? ['fields'] : []),
    ]);
    const fields = fieldsOf(this.input).map(({ field }) => field);
    const adxTaken = fields
      .filter(field => taken.has(optionName(field)))
      .map(field => `${this.name} has a field ${field}, and adx gives it --${optionName(field)}`);
    const shared = fields
      .filter((field, i) => fields.findIndex(other => optionName(other) === optionName(field)) < i)
      .map(field => `${this.name} has two fields for --${optionName(field)}, one is ${field}`);
    const replaced = sharedWithGlobal(this.spec, this.#global).map(
      field => `${this.name} has a field ${field}, and so has the global input`,
    );
    return [...adxTaken, ...shared, ...replaced].map(message => declaration.issue(message));
  }

  // --fields alone, or with no name, lists the fields of the answer; else the answer keeps those
  // it names.
  async #withFields(input: unknown, read: Read, output: z.core.$ZodType): Promise<Answered> {
    const fields = answerFieldsOf(output);
    if (read.listed === 'fields') return fieldsListed(fields);
    if (typeof read.adx.fields !== 'string') return this.answered(input, NO_FIELDS);
    const lists = `${this.#call()} --fields`;
    const named = namesOf(read.adx.fields, fields, { command: this.name, lists });
    const [wrong, ...more] = this.#shown(named.issues);
    if (wrong !== undefined) return refused([wrong, ...more]);
    if (named.names.length === 0) return fieldsListed(fields);
    return this.answered(input, { dryRun: false, fields: named.names });
  }

  /**
   * A plan answers the dry run; the real run answers `{ ...planned, ...applied }` (decision 24).
   * With apply, a plan that answers no object leaves no place for apply's fields, so both runs
   * refuse it before apply can send anything.
   */
  async #effect(input: unknown, run: Run): Promise<Answered> {
    const planned = thrownIfRefused(await this.spec.plan?.(input, { refuse }));
    if (this.spec.apply !== undefined && isRecord(planned) === false) {
      const message = `the plan of ${this.name} answered no object, so apply cannot add to it`;
      return refused([declaration.issue(message)]);
    }
    if (run.dryRun)
      return { answer: { ok: true, applied: false, result: planned }, ...this.#text() };
    const applied = thrownIfRefused(await this.spec.apply?.(input, { planned, refuse }));
    const result = isRecord(planned)
      ? { ...planned, ...(isRecord(applied) ? applied : {}) }
      : planned;
    return { answer: { ok: true, applied: true, result }, ...this.#text() };
  }

  #optionsOf(fields: readonly FieldOf[]) {
    const options = new Map<string, Option>();
    for (const { field, takes, repeats } of fields) {
      if (takes !== 'json')
        options.set(optionName(field), { name: optionName(field), takes, repeats, field });
    }
    for (const { option, takes } of this.#adxOptions()) {
      options.set(option.slice(2), { name: option.slice(2), takes, repeats: false });
    }
    return options;
  }

  #adxOptions() {
    return [
      JSON_OPTION,
      HELP_OPTION,
      ...(this.kind === 'effect' ? [DRY_RUN_OPTION] : []),
      ...(this.#hasFields() ? [FIELDS_OPTION] : []),
    ];
  }

  // --fields of a list comes with its outline, so only a read with output takes it yet.
  #output() {
    return this.kind === 'read' ? this.spec.output : undefined;
  }

  #hasFields() {
    return this.#output() !== undefined;
  }

  #help(fields: readonly FieldOf[]) {
    const example = this.spec.example;
    return helpOf({
      command: this.#call(),
      does: this.spec.does,
      fields,
      options: this.#adxOptions(),
      example,
    });
  }

  // The terminal form of a list is its items, each by its own text, which a list builds later.
  #text() {
    const text = this.spec.text;
    if (text === undefined || this.kind === 'list') return {};
    return { text: (result: unknown) => text.call(this.spec, result) };
  }

  // Each of adx's own issues names the call that shows what the command takes.
  #shown(issues: readonly Issue[]) {
    const place = this.places[0];
    if (place === undefined) return [...issues];
    const step: Step = {
      does: `shows what ${this.name} takes`,
      command: `${place.tool} schema ${place.words}`,
    };
    return issues.map(issue => withCommand(issue, step));
  }

  #call() {
    const place = this.places[0];
    return place === undefined ? this.name : `${place.tool} ${place.words}`;
  }
}

function thrownIfRefused(value: unknown) {
  if (value instanceof Refused) throw value;
  return value;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;
