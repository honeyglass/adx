import { declaration, NOTHING_CHANGED, notInList, placeOf, Refused, refusedWith, unknownOption, withCommand, } from "../core/index.js";
import { refused } from "./answered.js";
import { argumentsOf, optionName } from "./argv.js";
import { namesOf, picked } from "./fields.js";
import { helpFacts, helpOf } from "./help.js";
import { acceptsValue, answerFieldsOf, choicesOf, fieldsOf, inputOf, knownOf, parsedBy, sharedWithGlobal, } from "./input.js";
import { jsonInput } from "./json.js";
import { PAGE_SIZE } from "./limits.js";
import { listedAnswer } from "./listed.js";
const JSON_OPTION = {
    option: '--json',
    takes: 'json',
    does: 'the whole input as one JSON object',
};
const HELP_OPTION = {
    option: '--help',
    takes: 'switch',
    does: 'shows what the command takes',
};
const DRY_RUN_OPTION = {
    option: '--dry-run',
    takes: 'switch',
    does: 'runs plan only and changes nothing',
};
const REPLACE_OPTION = {
    option: '--replace',
    takes: 'switch',
    does: 'lets a write replace a file that holds other bytes',
};
const FIELDS_OPTION = {
    option: '--fields',
    takes: 'text',
    does: 'the fields of the answer, each whole; alone, it lists them',
};
/** The options adx gives every command, also those it does not build yet: a field takes none. */
const ALWAYS_TAKEN = ['json', 'output', 'help', 'dry-run', 'replace'];
/** The code a value outside its list is refused with, by its name. */
const NOT_IN_LIST = notInList.issue().code;
/** The one refuse of every handler; what was refused stopped before adx changed anything. */
const refuse = (...issues) => refusedWith(issues, NOTHING_CHANGED);
export class Runner {
    kind;
    spec;
    input;
    /** Every place a tool lists the command; more than one is a DECLARATION error. */
    places = [];
    #global;
    constructor(kind, spec, global) {
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
    fields() {
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
    sourceOf(field) {
        const own = valueIn(this.spec.values, field);
        if (own !== undefined)
            return own;
        const shared = this.#takesGlobal(field) ? valueIn(this.#global?.values, field) : undefined;
        if (shared !== undefined)
            return shared;
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
    async accepts(field, value, beside) {
        if (acceptsValue(this.input, field, value) === false)
            return false;
        const given = Object.fromEntries(Object.entries(beside).filter(([key]) => key !== field));
        const checked = knownOf(this.input, given).data;
        return (await this.#sources()?.accepts(this, field, value, { given, checked })) ?? false;
    }
    /**
     * @param tokens - the tokens of the call after the command words
     * @param before - the issues of the tokens before the command words
     * @param stdin - what the call reads from stdin, read only for `--json -` and never for --help
     * @returns the answer when the call ends before its handler, else the call ready for it
     */
    async read(tokens, before, stdin) {
        const fields = fieldsOf(this.input);
        const listable = this.#listable(fields);
        const read = argumentsOf(tokens, this.#optionsOf(fields), {
            command: this.name,
            listable: new Set([...(this.#hasFields() ? ['fields'] : []), ...listable.keys()]),
        });
        const json = typeof read.adx.json === 'string'
            ? await jsonInput(read.given, read.adx.json, read.adx.help === true ? undefined : stdin)
            : { input: read.given, issues: [] };
        const [first, ...rest] = this.#shown([...before, ...read.issues, ...json.issues]);
        if (first !== undefined)
            return refused([first, ...rest]);
        if (read.adx.help === true)
            return this.#help(fields);
        const run = this.#runOf(read);
        const lists = read.listed === undefined ? undefined : listable.get(read.listed);
        if (lists !== undefined)
            return this.#listing(lists, json.input, read, run);
        const output = this.output();
        if (output !== undefined)
            return this.#withFields(json.input, read, output, run);
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
    through(input, run, scene) {
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
    async answered(value, run, writer) {
        const given = isRecord(value) ? value : {};
        const sources = this.#sources();
        if (run.lists !== undefined && sources !== undefined) {
            return this.#listed(run.lists, given, sources);
        }
        const parsed = parsedBy(this.input, value);
        const [failed, ...rest] = this.#inputIssues(parsed.issues, given);
        if (failed !== undefined)
            throw refusedWith([failed, ...rest], NOTHING_CHANGED);
        const input = parsed.data ?? {};
        const [path, ...paths] = (await writer?.paths(input)) ?? [];
        if (path !== undefined)
            throw refusedWith([path, ...paths], NOTHING_CHANGED);
        const [wrong, ...others] = (await sources?.outside(this, { given, checked: input })) ?? [];
        if (wrong !== undefined)
            throw refusedWith([wrong, ...others], NOTHING_CHANGED);
        const [issue, ...more] = this.spec.check?.(input) ?? [];
        if (issue !== undefined)
            throw refusedWith([issue, ...more], NOTHING_CHANGED);
        if (this.kind === 'effect')
            return this.#effect(input, run, writer);
        const page = { cursor: '', size: this.spec.pageSize ?? PAGE_SIZE };
        const result = thrownIfRefused(await this.spec.run?.(input, { refuse, page }));
        const ran = { result, input };
        if (run.fields === undefined)
            return { answer: { ok: true, result }, ...this.#text(), ran };
        // The author's text reads the whole answer; a cut one prints in adx's own form.
        return { answer: { ok: true, result: picked(result, run.fields) }, ran };
    }
    /**
     * @returns one DECLARATION issue per field named like an option adx gives the command, per
     * option two fields would share, and per field the global input would replace
     */
    clashes() {
        const taken = new Set([
            ...ALWAYS_TAKEN,
            ...(this.kind === 'list' ? ['page', 'fields'] : []),
            ...(this.#hasFields() ? ['fields'] : []),
            ...this.#roots().map(({ name }) => name),
        ]);
        const fields = fieldsOf(this.input).map(({ field }) => field);
        const adxTaken = fields
            .filter(field => taken.has(optionName(field)) || taken.has(field))
            .map(field => `${this.name} has a field ${field}, and adx gives it --${optionName(field)}`);
        const shared = fields
            .filter((field, i) => fields.findIndex(other => optionName(other) === optionName(field)) < i)
            .map(field => `${this.name} has two fields for --${optionName(field)}, one is ${field}`);
        const replaced = sharedWithGlobal(this.spec, this.#global?.input).map(field => `${this.name} has a field ${field}, and so has the global input`);
        return [...adxTaken, ...shared, ...replaced].map(message => declaration.issue(message));
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
            ...(this.spec.replace === 'always' ? { replace: 'always' } : {}),
        };
    }
    /** @returns the schema of the answer, which only a read declares, with `output` */
    output() {
        return this.kind === 'read' ? this.spec.output : undefined;
    }
    /** @returns the step to what the command takes, or undefined while no tool lists it */
    schemaStep() {
        const place = this.places[0];
        if (place === undefined)
            return undefined;
        return {
            does: `shows what ${this.name} takes`,
            command: `${place.tool} schema ${place.words}`,
        };
    }
    // The options of adx a run takes, and the folder of each root option, by its root.
    #runOf(read) {
        const named = this.#roots().filter(({ name }) => typeof read.adx[name] === 'string');
        return {
            dryRun: read.adx['dry-run'] === true,
            fields: undefined,
            lists: undefined,
            replace: read.adx.replace === true,
            folders: Object.fromEntries(named.map(({ name }) => [name, `${read.adx[name]}`])),
        };
    }
    // A call that lists values runs nothing else, so an option of a run beside it is refused.
    #listing(lists, input, read, run) {
        const beside = ['dry-run', 'replace', 'fields'].filter(name => Object.hasOwn(read.adx, name));
        const issues = beside.map(name => {
            const message = `--${name} is no option of a call that lists the values of --${read.listed}`;
            return unknownOption.at(name, message);
        });
        const [first, ...rest] = this.#shown(issues);
        if (first !== undefined)
            return refused([first, ...rest]);
        return { input, run: { ...run, lists } };
    }
    // The other fields of the call pass their schema first, so a source gets checked values.
    async #listed(field, given, sources) {
        const known = knownOf(this.input, given);
        const [failed, ...rest] = this.#inputIssues(known.issues, given);
        if (failed !== undefined)
            throw refusedWith([failed, ...rest], NOTHING_CHANGED);
        const listed = await sources.listed(this, field, { given, checked: known.data });
        if ('issues' in listed)
            throw refusedWith(listed.issues, NOTHING_CHANGED);
        return listedAnswer(optionName(field), listed);
    }
    // --fields alone, or with no name, lists the fields of the answer; else the answer keeps those
    // it names.
    #withFields(input, read, output, run) {
        const fields = answerFieldsOf(output);
        if (read.listed === 'fields')
            return listedAnswer('fields', { values: fields });
        if (typeof read.adx.fields !== 'string')
            return { input, run };
        const lists = `${this.#call()} --fields`;
        const named = namesOf(read.adx.fields, fields, { command: this.name, lists });
        const [wrong, ...more] = this.#shown(named.issues);
        if (wrong !== undefined)
            return refused([wrong, ...more]);
        if (named.names.length === 0)
            return listedAnswer('fields', { values: fields });
        return { input, run: { ...run, fields: named.names } };
    }
    /**
     * A plan answers the dry run; the real run answers `{ ...planned, ...applied }` (decision 24).
     * With apply, a plan that answers no object leaves no place for apply's fields, so both runs
     * refuse it before apply can send anything. The files the plan staged are written after it,
     * before apply, and never on a dry run; --replace is known only to a plan that stages a write
     * (decision 47).
     */
    async #effect(input, run, writer) {
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
        if (run.dryRun === false)
            await writer?.commit();
        if (run.dryRun) {
            const ran = { result: planned, input };
            return { answer: { ok: true, applied: false, result: planned }, ...this.#text(), ran };
        }
        const applied = thrownIfRefused(await this.spec.apply?.(input, { planned, refuse }));
        const result = isRecord(planned)
            ? { ...planned, ...(isRecord(applied) ? applied : {}) }
            : planned;
        return { answer: { ok: true, applied: true, result }, ...this.#text(), ran: { result, input } };
    }
    #optionsOf(fields) {
        const options = new Map();
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
        const roots = this.#roots().flatMap(({ name, variable }) => {
            if (variable === undefined)
                return [];
            const does = `the folder of the root ${name}, in place of ${variable}`;
            return [{ option: `--${name}`, takes: 'text', does }];
        });
        return [
            JSON_OPTION,
            HELP_OPTION,
            ...(this.kind === 'effect' ? [DRY_RUN_OPTION] : []),
            ...(this.kind === 'effect' && this.spec.replace === undefined ? [REPLACE_OPTION] : []),
            ...(this.#hasFields() ? [FIELDS_OPTION] : []),
            ...roots,
        ];
    }
    #roots() {
        return this.places[0]?.roots ?? [];
    }
    // --fields of a list comes with its outline, so only a read with output takes it yet.
    #hasFields() {
        return this.output() !== undefined;
    }
    #help(fields) {
        return helpOf(this.#facts(fields));
    }
    #facts(fields) {
        return {
            command: this.#call(),
            does: this.spec.does,
            fields,
            options: this.#adxOptions(),
            example: this.spec.example,
        };
    }
    // The terminal form of a list is its items, each by its own text, which a list builds later.
    #text() {
        const text = this.spec.text;
        if (text === undefined || this.kind === 'list')
            return {};
        return { text: (result) => text.call(this.spec, result) };
    }
    // Each field with a source and an option, by that option.
    #listable(fields) {
        const listed = fields.filter(({ field, takes }) => takes !== 'json' && this.sourceOf(field) !== undefined);
        return new Map(listed.map(({ field }) => [optionName(field), field]));
    }
    #sources() {
        return this.places[0]?.sources;
    }
    #takesGlobal(field) {
        const global = this.#global?.input.shape;
        return global !== undefined && this.spec.global !== false && Object.hasOwn(global, field);
    }
    // A value outside its list names the call that lists the values; every other issue of the
    // input names the call that shows what the command takes.
    #inputIssues(issues, given) {
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
    #shown(issues) {
        const step = this.schemaStep();
        if (step === undefined)
            return [...issues];
        return issues.map(issue => (placeOf(issue) === undefined ? withCommand(issue, step) : issue));
    }
    #call() {
        const place = this.places[0];
        return place === undefined ? this.name : `${place.tool} ${place.words}`;
    }
}
function thrownIfRefused(value) {
    if (value instanceof Refused)
        throw value;
    return value;
}
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
const valueIn = (record, key) => record !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
