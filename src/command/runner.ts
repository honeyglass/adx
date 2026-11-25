/**
 * What runs one command: its options, its layers of checks, and its handler.
 *
 * Kind, Run, Ready: the three kinds, what a run is asked for, and a call ready for its handler.
 * Place, Through: where a tool lists a command, and how that tool answers a call of it.
 * SHARED_OPTIONS: the options adx gives some command, and to which, for `schema`.
 * Runner: read, a call from its tokens; answered, its handler run, or the values of an option
 * given alone; through, for invoke; what a step and the sources read of the command; what
 * `schema` shows of it; and the input as a step carries it.
 *
 * A list answers its outline, the key first, or the fields --fields names, of each item of its
 * page (rule 16). What `next`, `after` and the text of a list read is the whole page.
 *
 * adx checks in layers: the arguments, then the schema, then each path of a file against the
 * disk, then each value against its list, then `check`, then the handler. Each layer collects
 * all its issues, and a later layer runs only when the earlier ones passed. From the schema on, a
 * refusal is thrown, as one the handler throws, so the tool answers them alike, with the commands
 * that help. The sources come from the tool that lists the command, so a command no tool lists
 * checks no value against a list. A SCHEMA issue placed in the input gets its command from the
 * tool, which knows the shapes it may lie in.
 *
 * @example const read = await runnerOf(greet)?.read(tokens, [], stdin);
 */
import { $try, RefusalError, trySync$ } from '@honeyglass/utils/ts';
import {
  declaration,
  issueAnswer,
  largeness,
  NOTHING_CHANGED,
  notInList,
  oneLine,
  pathOf,
  placeOf,
  Refused,
  refusedWith,
  UNKNOWN_STATE,
  unknownOption,
  withCommand,
  withLook,
} from '../core/index.ts';
import type {
  Act,
  Declared,
  Fake,
  Issue,
  Known,
  Sourced,
  Sources,
  Stdin,
  Step,
  TargetField,
  Token,
  Writer,
} from '../core/index.ts';
import { refused } from './answered.ts';
import type { Answered } from './answered.ts';
import { argumentsOf, optionName } from './argv.ts';
import type { Option, Read } from './argv.ts';
import { itemsOf, namesOf, picked, pickedItems } from './fields.ts';
import { helpFacts, helpOf } from './help.ts';
import type { AdxOption, Help } from './help.ts';
import {
  acceptsValue,
  answerFieldsOf,
  choicesOf,
  fieldsOf,
  inputOf,
  knownOf,
  parsedBy,
  sharedWithGlobal,
} from './input.ts';
import type { FieldOf } from './input.ts';
import { jsonInput } from './json.ts';
import { PAGE_SIZE } from './limits.ts';
import { listedAnswer } from './listed.ts';
import type { Obj, Shared, Spec } from './types.ts';

export type Kind = 'read' | 'list' | 'effect';

/**
 * `fields` holds the names --fields gave, if any; `lists` the field whose option came alone;
 * `page` the cursor --page gave; `replace` whether the call said --replace; `folders` the folder
 * each root option gave, by the name of its root.
 */
export type Run = {
  dryRun: boolean;
  fields: readonly string[] | undefined;
  lists: string | undefined;
  page: string | undefined;
  replace: boolean;
  folders: Readonly<Record<string, string>>;
};

/** The samples of an invoke in a test: its variables, the seed of its data folder, its fakes. */
export type Scene = {
  env?: Readonly<Record<string, string>>;
  seed?: string;
  fakes?: readonly Fake[];
};

/** The input of a call as its options and --json gave it, and what the run is asked for. */
export type Ready = { input: Record<string, unknown>; run: Run };

/** The tool answers an invoke of its command with the steps after it and the hints of its codes. */
export type Through = (call: {
  runner: Runner;
  input: unknown;
  run: Run;
  scene: Scene;
}) => Promise<Answered>;

/** A root of the tool; one with a variable the call can also move with an option of its name. */
export type RootOption = { name: string; variable?: string };

/**
 * `tool` is the name of the tool, `words` the words of the command in its table, `sources` the
 * port through which the command asks the sources of its fields, `roots` the tool's roots, and
 * `act` the send its `apply` gets.
 */
export type Place = {
  tool: string;
  words: string;
  through: Through;
  sources: Sources;
  roots: readonly RootOption[];
  act: Act;
};

/** What decides whether a command takes an option of adx: its kind, `replace`, and --fields. */
type Taker = { kind: Kind; replace: Spec['replace']; fields: boolean };

/**
 * Each option adx gives some command, in words for `schema`, and in a check for the command; a
 * root option comes on top, by the tool's roots. A field takes the name of none that is
 * `everywhere`, on any command, and of none the command is given (decision 71).
 */
const SHARED: readonly (AdxOption & {
  for: string;
  given: (taker: Taker) => boolean;
  everywhere: boolean;
})[] = [
  {
    option: '--json',
    takes: 'json',
    does: 'the whole input as one JSON object',
    for: 'every command',
    given: () => true,
    everywhere: true,
  },
  {
    option: '--output',
    takes: 'text',
    does: 'the form of the answer, text or json, in place of the one stdout picks',
    for: 'every command',
    given: () => true,
    everywhere: true,
  },
  {
    option: '--help',
    takes: 'switch',
    does: 'shows what the command takes',
    for: 'every command',
    given: () => true,
    everywhere: true,
  },
  {
    option: '--dry-run',
    takes: 'switch',
    does: 'runs plan only and changes nothing',
    for: 'every effect',
    given: ({ kind }) => kind === 'effect',
    everywhere: true,
  },
  {
    option: '--replace',
    takes: 'switch',
    does: 'lets a write replace a file that holds other bytes',
    for: 'every effect without replace: false or always',
    given: ({ kind, replace }) => kind === 'effect' && replace === undefined,
    everywhere: true,
  },
  {
    option: '--page',
    takes: 'text',
    does: 'the page the previous answer named',
    for: 'every list',
    given: ({ kind }) => kind === 'list',
    everywhere: false,
  },
  {
    option: '--fields',
    takes: 'text',
    does: 'the fields of the answer, each whole; alone, it lists them',
    for: 'every list, and every read with output',
    given: ({ fields }) => fields,
    everywhere: false,
  },
];

/** The options adx gives some command, and the commands each goes to, as `schema` lists them. */
export const SHARED_OPTIONS = SHARED.map(({ option, takes, does, for: to }) => ({
  option,
  takes,
  does,
  for: to,
}));

/** Every option adx gives some command, so no root option may take its name. */
export const ADX_OPTIONS = SHARED.map(({ option }) => option.slice(2));

/** The code a value outside its list is refused with, by its name. */
const NOT_IN_LIST = notInList.issue().code;

/** The one refuse of every handler; what was refused stopped before adx changed anything. */
const refuse = (...issues: [Issue, ...Issue[]]) => refusedWith(issues, NOTHING_CHANGED);

export class Runner implements Sourced {
  readonly kind: Kind;
  readonly spec: Spec;
  readonly input: Obj;
  /** Every place a tool lists the command; more than one is a DECLARATION error. */
  readonly places: Place[] = [];
  readonly #global: Shared | undefined;

  constructor(kind: Kind, spec: Spec, global: Shared | undefined) {
    this.kind = kind;
    this.spec = spec;
    this.#global = global;
    this.input = inputOf(spec, global?.input);
  }

  get name() {
    return this.places[0]?.words ?? '';
  }

  get does() {
    return this.spec.does;
  }

  get call() {
    const place = this.places[0];
    return place === undefined ? undefined : [place.tool, ...place.words.split(' ')];
  }

  /** @returns each field of the input with its option, the global fields marked */
  fields(): TargetField[] {
    return fieldsOf(this.input).map(({ field, takes, repeats, required }) => ({
      field,
      ...(takes === 'json' ? {} : { option: optionName(field) }),
      switch: takes === 'switch',
      repeats,
      required,
      global: this.#takesGlobal(field),
    }));
  }

  /**
   * The command's own `values` win, then those of the global input for a global field it takes;
   * an enum is a source of its own values.
   *
   * @returns the source of the field, or undefined for a field without one
   */
  sourceOf(field: string): Declared | undefined {
    const own = valueIn(this.spec.values, field);
    if (own !== undefined) return own;
    const shared = this.#takesGlobal(field) ? valueIn(this.#global?.values, field) : undefined;
    if (shared !== undefined) return shared;
    const choices = choicesOf(this.input, field);
    return choices === undefined ? undefined : () => choices;
  }

  /**
   * The one place that decides a value a step carries (decision 79): it passes the schema of
   * the field, and its source takes it. A command no tool lists has no sources to ask, so the
   * value stays out.
   *
   * @param field - the field the step carries
   * @param value - the value of the refused call
   * @param beside - the other fields a real call of the step would hold
   * @returns whether a real call of the command would take the value
   */
  async accepts(field: string, value: unknown, beside: Readonly<Record<string, unknown>>) {
    if (acceptsValue(this.input, field, value) === false) return false;
    const given = Object.fromEntries(Object.entries(beside).filter(([key]) => key !== field));
    const checked = knownOf(this.input, given).data;
    return (await this.#sources()?.accepts(this, field, value, { given, checked })) ?? false;
  }

  /**
   * A step carries a path as adx shows it, cleaned and relative to its root, so
   * `./internal/billing/` rides along as `internal/billing`; a field that fails its schema stays
   * as given.
   *
   * @param given - the input of the call as its caller gave it
   * @returns the same input, each path field, or list of paths, as adx shows it
   */
  shown(given: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const { data } = knownOf(this.input, given);
    return Object.fromEntries(
      Object.entries(given).map(([field, value]) => [field, shownPath(data[field]) ?? value]),
    );
  }

  /**
   * @param tokens - the tokens of the call after the command words
   * @param before - the issues of the tokens before the command words
   * @param stdin - what the call reads from stdin, read only for `--json -` and never for --help
   * @returns the answer when the call ends before its handler, else the call ready for it
   */
  async read(
    tokens: readonly Token[],
    before: readonly Issue[],
    stdin: Stdin,
  ): Promise<Answered | Ready> {
    const fields = fieldsOf(this.input);
    const listable = this.#listable(fields);
    const read = argumentsOf(tokens, this.#optionsOf(fields), {
      command: this.name,
      listable: new Set([...(this.#hasFields() ? ['fields'] : []), ...listable.keys()]),
    });
    const json =
      typeof read.adx.json === 'string'
        ? await jsonInput(read.given, read.adx.json, read.adx.help === true ? undefined : stdin)
        : { input: read.given, issues: [] };
    const [first, ...rest] = this.#shown([...before, ...read.issues, ...json.issues]);
    if (first !== undefined) return refused([first, ...rest]);
    if (read.adx.help === true) return this.#help(fields);
    const run = this.#runOf(read);
    const [beside, ...others] = this.#shown(besideListed(read));
    if (beside !== undefined) return refused([beside, ...others]);
    const lists = read.listed === undefined ? undefined : listable.get(read.listed);
    if (lists !== undefined) return { input: json.input, run: { ...run, lists } };
    if (this.#hasFields()) return this.#withFields(json.input, read, run);
    return { input: json.input, run };
  }

  /**
   * invoke answers as the tool that lists the command, and as the command alone before one does.
   *
   * @param input - the input of the call
   * @param run - whether it is a dry run, and whether it may replace a file
   * @param scene - the variables and the seed of the test that invokes the command
   * @returns the answer; a refusal and a bug are thrown
   */
  through(input: unknown, run: Run, scene: Scene): Promise<Answered> {
    const place = this.places[0];
    return place === undefined
      ? this.answered(input, run, undefined)
      : place.through({ runner: this, input, run, scene });
  }

  /**
   * @param value - the input of the call, from its options and --json, or from invoke
   * @param run - whether it is a dry run, the fields the answer keeps, and a field to list
   * @param writer - the writes of the call, which a tool gives; none for a command no tool lists
   * @returns the answer, or the values of the field to list; a refusal of the schema, of a path,
   * of a list, of `check` or of the handler, and a bug, are thrown
   */
  async answered(value: unknown, run: Run, writer: Writer | undefined): Promise<Answered> {
    const given = isRecord(value) ? value : {};
    const sources = this.#sources();
    if (run.lists !== undefined && sources !== undefined) {
      return this.#listed(run.lists, given, sources);
    }
    const parsed = parsedBy(this.input, value);
    const [failed, ...rest] = this.#inputIssues(parsed.issues, given);
    if (failed !== undefined) throw refusedWith([failed, ...rest], NOTHING_CHANGED);
    const input = parsed.data ?? {};
    const [path, ...paths] = (await writer?.paths(input)) ?? [];
    if (path !== undefined) throw refusedWith([path, ...paths], NOTHING_CHANGED);
    const [wrong, ...others] = (await sources?.outside(this, { given, checked: input })) ?? [];
    if (wrong !== undefined) throw refusedWith([wrong, ...others], NOTHING_CHANGED);
    const [issue, ...more] = this.spec.check?.(input) ?? [];
    if (issue !== undefined) throw refusedWith([issue, ...more], NOTHING_CHANGED);
    if (this.kind === 'effect') return this.#effect(input, run, writer);
    const page = { cursor: run.page ?? '', size: this.pageSize() };
    const result = thrownIfRefused(await this.spec.run?.(input, { refuse, page }));
    const ran = { result, input };
    if (this.kind === 'list') return this.#page(result, run, ran);
    this.#bounded(result);
    if (run.fields === undefined) return { answer: { ok: true, result }, ...this.#text(), ran };
    // The author's text reads the whole answer; a cut one prints in adx's own form.
    return { answer: { ok: true, result: picked(result, run.fields) }, ran };
  }

  // Without output nobody can cut the answer with --fields, so a long list or a large document
  // is the read's bug (decision 91); a startup check cannot see the size of an answer.
  #bounded(result: unknown) {
    if (this.spec.output !== undefined) return;
    const said = largeness(result, `${JSON.stringify({ ok: true, result })}\n`);
    if (said.length === 0) return;
    const message = `${this.#call()} answers ${said.join(' ')} and has no output, by which a caller cuts it with --fields`;
    throw refusedWith([declaration.issue(message)], NOTHING_CHANGED);
  }

  /**
   * @returns one DECLARATION issue per field named like an option adx gives the command, per
   * option two fields would share, and per field the global input would replace
   */
  clashes(): Issue[] {
    const taker = this.#taker();
    const taken = new Set([
      ...SHARED.filter(shared => shared.everywhere || shared.given(taker)).map(({ option }) =>
        option.slice(2),
      ),
      ...this.#roots().map(({ name }) => name),
    ]);
    const fields = fieldsOf(this.input).map(({ field }) => field);
    const adxTaken = fields
      .filter(field => taken.has(optionName(field)) || taken.has(field))
      .map(field => `${this.name} has a field ${field}, and adx gives it --${optionName(field)}`);
    const shared = fields
      .filter((field, i) => fields.findIndex(other => optionName(other) === optionName(field)) < i)
      .map(field => `${this.name} has two fields for --${optionName(field)}, one is ${field}`);
    const replaced = sharedWithGlobal(this.spec, this.#global?.input).map(
      field => `${this.name} has a field ${field}, and so has the global input`,
    );
    return [...adxTaken, ...shared, ...replaced].map(message => declaration.issue(message));
  }

  /**
   * The compiler checks the type of an example, not its values, such as a `.regex()`.
   *
   * Only the input schema is checked here. A path that leaves its root, a `check` rule across
   * fields and a value outside a source of `values` show only at a call, since they need the
   * disk, the whole input or the sources.
   *
   * @returns one DECLARATION issue per place where the example `schema` shows fails the input,
   * or one for an input that throws on the example, such as in a transform
   */
  exampleIssues(): Issue[] {
    const example = this.#example();
    if (example === undefined) return [];
    const said = `${this.#call()} has the example ${JSON.stringify(example)}`;
    const parsed = trySync$(() => parsedBy(this.input, example));
    if (parsed.error !== null) {
      const reason = parsed.error instanceof Error ? parsed.error.message : `${parsed.error}`;
      return [declaration.issue(`${said}, and its input threw on it: ${reason}`)];
    }
    return parsed.data.issues.map(issue => {
      const { path, message } = issueAnswer(issue);
      const at = path === undefined ? '' : ` at ${path}`;
      return declaration.issue(`${said}, which fails its input${at}: ${message}`);
    });
  }

  /**
   * @returns what `schema <command>` shows beside its input: the facts of --help, the fields
   * whose option alone lists their values, and the global fields the command takes
   */
  schemaFacts() {
    const fields = fieldsOf(this.input);
    return {
      ...helpFacts(this.#facts(fields)),
      lists: [...this.#listable(fields).values()],
      global: this.fields()
        .filter(field => field.global)
        .map(({ field }) => field),
      ...(this.kind === 'list'
        ? { key: this.spec.key, outline: this.#outline(), pageSize: this.pageSize() }
        : {}),
      ...(this.spec.replace === 'always' ? { replace: 'always' } : {}),
    };
  }

  /** @returns the schema of the answer, which only a read declares, with `output` */
  output() {
    return this.kind === 'read' ? this.spec.output : undefined;
  }

  /** @returns the schema of one item, which only a list declares */
  item() {
    return this.kind === 'list' ? this.spec.item : undefined;
  }

  /** @returns the fields of an item that the outline of a list leaves out */
  hidden() {
    const outline = this.#outline();
    return this.#answerFields()
      .map(field => field.value)
      .filter(field => outline.includes(field) === false);
  }

  /** The size of every page of a list: its own, or 50 (decision 56). */
  pageSize() {
    return this.spec.pageSize ?? PAGE_SIZE;
  }

  /** @returns the step to what the command takes, or undefined while no tool lists it */
  schemaStep(): Step | undefined {
    const place = this.places[0];
    if (place === undefined) return undefined;
    return {
      does: `shows what ${this.name} takes`,
      command: `${place.tool} schema ${place.words}`,
    };
  }

  // The options of adx a run takes, and the folder of each root option, by its root.
  #runOf(read: Read): Run {
    const named = this.#roots().filter(({ name }) => typeof read.adx[name] === 'string');
    return {
      dryRun: read.adx['dry-run'] === true,
      fields: undefined,
      lists: undefined,
      page: typeof read.adx.page === 'string' ? read.adx.page : undefined,
      replace: read.adx.replace === true,
      folders: Object.fromEntries(named.map(({ name }) => [name, `${read.adx[name]}`])),
    };
  }

  // The other fields of the call pass their schema first, so a source gets checked values.
  async #listed(field: string, given: Known['given'], sources: Sources): Promise<Answered> {
    const known = knownOf(this.input, given);
    const [failed, ...rest] = this.#inputIssues(known.issues, given);
    if (failed !== undefined) throw refusedWith([failed, ...rest], NOTHING_CHANGED);
    const listed = await sources.listed(this, field, { given, checked: known.data });
    if ('issues' in listed) throw refusedWith(listed.issues, NOTHING_CHANGED);
    return listedAnswer(optionName(field), listed);
  }

  // --fields alone, or with no name, lists the fields of the answer; else the answer keeps those
  // it names.
  #withFields(input: Record<string, unknown>, read: Read, run: Run) {
    const fields = this.#answerFields();
    if (read.listed === 'fields') return listedAnswer('fields', { values: fields });
    if (typeof read.adx.fields !== 'string') return { input, run };
    const lists = `${this.#call()} --fields`;
    const named = namesOf(read.adx.fields, fields, { command: this.name, lists });
    const [wrong, ...more] = this.#shown(named.issues);
    if (wrong !== undefined) return refused([wrong, ...more]);
    if (named.names.length === 0) {
      const [beside, ...others] = this.#shown(besideOptions(read, 'fields'));
      if (beside !== undefined) return refused([beside, ...others]);
      return listedAnswer('fields', { values: fields });
    }
    return { input, run: { ...run, fields: named.names } };
  }

  /**
   * A plan answers the dry run; the real run answers `{ ...planned, ...applied }` (decision 24).
   * With apply, a plan that answers no object leaves no place for apply's fields, so both runs
   * refuse it before apply can send anything. The files the plan staged are written after it,
   * before apply, and never on a dry run; --replace is known only to a plan that stages a write
   * (decision 47). A refusal out of apply keeps `look` beside it, the call that shows what apply
   * left, which the tool names when a request may have taken effect.
   */
  async #effect(input: unknown, run: Run, writer: Writer | undefined): Promise<Answered> {
    const ctx = { refuse, ...(writer === undefined ? {} : { files: writer.files }) };
    const planned = thrownIfRefused(await this.spec.plan?.(input, ctx));
    const message = '--replace is no option of a call whose plan writes no file';
    const [unknown, ...more] = this.#shown([unknownOption.at('replace', message)]);
    if (run.replace && (writer?.writes ?? 0) === 0 && unknown !== undefined) {
      return refused([unknown, ...more]);
    }
    if (this.spec.apply !== undefined && isRecord(planned) === false) {
      const message = `the plan of ${this.name} answered no object, so apply cannot add to it`;
      return refused([declaration.issue(message)]);
    }
    if (run.dryRun === false) await writer?.commit();
    if (run.dryRun) {
      const ran = { result: planned, input };
      return { answer: { ok: true, applied: false, result: planned }, ...this.#text(), ran };
    }
    const applied = await this.#applied(input, planned);
    const result = isRecord(planned)
      ? { ...planned, ...(isRecord(applied) ? applied : {}) }
      : planned;
    return { answer: { ok: true, applied: true, result }, ...this.#text(), ran: { result, input } };
  }

  // Only a refusal gets the look; any other error, a bug, flies on as it came.
  async #applied(input: unknown, planned: unknown) {
    const act = this.places[0]?.act ?? UNPLACED;
    const ctx = { act, planned, refuse };
    const { data, error } = await $try(async () =>
      thrownIfRefused(await this.spec.apply?.(input, ctx)),
    );
    if (error === null) return data;
    const look = error instanceof RefusalError ? this.spec.look?.(input) : undefined;
    if (look !== undefined) withLook(error, look);
    throw error;
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
    const roots = this.#roots().flatMap(({ name, variable }): AdxOption[] => {
      if (variable === undefined) return [];
      const does = `the folder of the root ${name}, in place of ${variable}`;
      return [{ option: `--${name}`, takes: 'text', does }];
    });
    const taker = this.#taker();
    const given = SHARED.filter(shared => shared.given(taker)).map(
      ({ option, takes, does }): AdxOption => ({ option, takes, does }),
    );
    return [...given, ...roots];
  }

  #taker(): Taker {
    return { kind: this.kind, replace: this.spec.replace, fields: this.#hasFields() };
  }

  #roots() {
    return this.places[0]?.roots ?? [];
  }

  // A list and a read with output take --fields.
  #hasFields() {
    return this.kind === 'list' || this.output() !== undefined;
  }

  // The fields of an item of a list, or of the answer of a read with output.
  #answerFields() {
    const shape = this.item() ?? this.output();
    return shape === undefined ? [] : answerFieldsOf(shape);
  }

  // The key stands first, once, then the further fields of the outline.
  #outline() {
    const { key, outline = [] } = this.spec;
    return key === undefined ? [...outline] : [key, ...outline.filter(field => field !== key)];
  }

  // A list answers its outline, or the fields --fields names; the author's text reads the whole
  // items, so a cut page prints in adx's own form. Each item keeps to its line, so a line break
  // in its text never shows as a second item.
  #page(result: unknown, run: Run, ran: { result: unknown; input: unknown }): Answered {
    const answer = { ok: true, result: pickedItems(result, run.fields ?? this.#outline()) };
    const text = this.spec.text;
    if (run.fields !== undefined || text === undefined) return { answer, ran };
    const lines = () => itemsOf(result).map(item => oneLine(text.call(this.spec, item)));
    return { answer, text: () => lines().join('\n'), ran };
  }

  #help(fields: readonly FieldOf[]) {
    return helpOf(this.#facts(fields));
  }

  #facts(fields: readonly FieldOf[]): Help {
    return {
      command: this.#call(),
      does: this.spec.does,
      fields,
      options: this.#adxOptions(),
      example: this.#example(),
    };
  }

  // The example of the whole input: the global fields the command takes, from the example of
  // the global input, then its own, so a call of it passes the schema `schema` shows. A command
  // without a required field of its own may leave its example out, as one without input does.
  #example() {
    const own = this.spec.example;
    const example = this.#global?.example;
    const shared = isRecord(example) ? example : {};
    const taken = Object.keys(shared).filter(field => this.#takesGlobal(field));
    const global = Object.fromEntries(taken.map(field => [field, shared[field]]));
    const needsOwn = this.fields().some(field => field.required && field.global === false);
    if (own === undefined && needsOwn === false && taken.length > 0) return global;
    return isRecord(own) ? { ...global, ...own } : own;
  }

  #text() {
    const text = this.spec.text;
    if (text === undefined) return {};
    return { text: (result: unknown) => text.call(this.spec, result) };
  }

  // Each field with a source and an option, by that option.
  #listable(fields: readonly FieldOf[]) {
    const listed = fields.filter(
      ({ field, takes }) => takes !== 'json' && this.sourceOf(field) !== undefined,
    );
    return new Map(listed.map(({ field }) => [optionName(field), field]));
  }

  #sources() {
    return this.places[0]?.sources;
  }

  #takesGlobal(field: string) {
    const global = this.#global?.input.shape;
    return global !== undefined && this.spec.global !== false && Object.hasOwn(global, field);
  }

  // A value outside its list names the call that lists the values; every other issue of the
  // input names the call that shows what the command takes.
  #inputIssues(issues: readonly Issue[], given: Known['given']) {
    const sources = this.#sources();
    const listed = issues.map(issue => {
      const field = issue.code === NOT_IN_LIST ? issue.path?.[0] : undefined;
      const step = field === undefined ? undefined : sources?.listStep(this, field, given);
      return step === undefined ? issue : withCommand(issue, step);
    });
    return this.#shown(listed);
  }

  // Each of adx's own issues names the call that shows what the command takes, but one placed in
  // the input, whose command the tool names.
  #shown(issues: readonly Issue[]) {
    const step = this.schemaStep();
    if (step === undefined) return [...issues];
    return issues.map(issue => (placeOf(issue) === undefined ? withCommand(issue, step) : issue));
  }

  #call() {
    const place = this.places[0];
    return place === undefined ? this.name : `${place.tool} ${place.words}`;
  }
}

/** The options of a run, which a call that lists values does not take. */
const RUN_OPTIONS = ['dry-run', 'replace', 'fields', 'page'];

// A call that lists values runs nothing else, so an option of a run beside it is refused.
const besideListed = (read: Read) =>
  read.listed === undefined ? [] : besideOptions(read, read.listed);

function besideOptions(read: Read, listed: string) {
  return RUN_OPTIONS.filter(name => name !== listed && Object.hasOwn(read.adx, name)).map(name =>
    unknownOption.at(name, `--${name} is no option of a call that lists the values of --${listed}`),
  );
}

// A path field holds a file or a folder, a repeated one a list of them.
function shownPath(value: unknown) {
  if (Array.isArray(value) === false) return pathOf(value);
  const paths = value.map(pathOf);
  return paths.length > 0 && paths.every(path => path !== undefined) ? paths : undefined;
}

/** The send of a command no tool lists, which has no remote to send through. */
const UNPLACED: Act = {
  async send() {
    const issue = declaration.issue('a command no tool lists sent a request');
    throw refusedWith([issue], UNKNOWN_STATE);
  },
};

function thrownIfRefused(value: unknown) {
  if (value instanceof Refused) throw value;
  return value;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

const valueIn = <T>(record: Readonly<Record<string, T>> | undefined, key: string) =>
  record !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
