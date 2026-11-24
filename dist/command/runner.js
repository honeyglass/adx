import { declaration, NOTHING_CHANGED, Refused, refusedWith, withCommand } from "../core/index.js";
import { refused } from "./answered.js";
import { argumentsOf, optionName } from "./argv.js";
import { fieldsListed, namesOf, picked } from "./fields.js";
import { helpOf } from "./help.js";
import { acceptsValue, answerFieldsOf, fieldsOf, inputOf, parsedBy, sharedWithGlobal, } from "./input.js";
import { withJson } from "./json.js";
import { PAGE_SIZE } from "./limits.js";
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
const FIELDS_OPTION = {
    option: '--fields',
    takes: 'text',
    does: 'the fields of the answer, each whole; alone, it lists them',
};
/** The options adx gives every command, also those it does not build yet: a field takes none. */
const ALWAYS_TAKEN = ['json', 'output', 'help', 'dry-run', 'replace'];
/** A read with output that the call names no fields of answers all of them. */
const NO_FIELDS = { dryRun: false, fields: undefined };
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
        this.input = inputOf(spec, global);
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
        const global = this.#global === undefined || this.spec.global === false ? {} : this.#global.shape;
        return fieldsOf(this.input).map(({ field, takes, repeats, required }) => ({
            field,
            ...(takes === 'json' ? {} : { option: optionName(field) }),
            switch: takes === 'switch',
            repeats,
            required,
            global: Object.hasOwn(global, field),
        }));
    }
    /** @returns whether the schema of the field takes the value a step would carry */
    async accepts(field, value) {
        return acceptsValue(this.input, field, value);
    }
    /**
     * @param tokens - the tokens of the call after the command words
     * @param before - the issues of the tokens before the command words
     * @returns the answer when the call ends before its handler, else the call ready for it
     */
    read(tokens, before) {
        const fields = fieldsOf(this.input);
        const read = argumentsOf(tokens, this.#optionsOf(fields), {
            command: this.name,
            listable: new Set(this.#hasFields() ? ['fields'] : []),
        });
        const json = typeof read.adx.json === 'string'
            ? withJson(read.given, read.adx.json)
            : { input: read.given, issues: [] };
        const [first, ...rest] = this.#shown([...before, ...read.issues, ...json.issues]);
        if (first !== undefined)
            return refused([first, ...rest]);
        if (read.adx.help === true)
            return this.#help(fields);
        const output = this.#output();
        if (output !== undefined)
            return this.#withFields(json.input, read, output);
        return { input: json.input, run: { dryRun: read.adx['dry-run'] === true, fields: undefined } };
    }
    /**
     * invoke answers as the tool that lists the command, and as the command alone before one does.
     *
     * @param input - the input of the call
     * @param run - whether it is a dry run
     * @returns the answer; a refusal and a bug are thrown
     */
    through(input, run) {
        const place = this.places[0];
        return place === undefined
            ? this.answered(input, run)
            : place.through({ runner: this, input, run });
    }
    /**
     * @param value - the input of the call, from its options and --json, or from invoke
     * @param run - whether it is a dry run, and the fields the answer keeps
     * @returns the answer; a refusal of `check` or the handler, and a bug, are thrown
     */
    async answered(value, run) {
        const parsed = parsedBy(this.input, value);
        const [failed, ...rest] = this.#shown(parsed.issues);
        if (failed !== undefined)
            return refused([failed, ...rest]);
        const input = parsed.data;
        const [issue, ...more] = this.spec.check?.(input) ?? [];
        if (issue !== undefined)
            throw refusedWith([issue, ...more], NOTHING_CHANGED);
        if (this.kind === 'effect')
            return this.#effect(input, run);
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
        ]);
        const fields = fieldsOf(this.input).map(({ field }) => field);
        const adxTaken = fields
            .filter(field => taken.has(optionName(field)))
            .map(field => `${this.name} has a field ${field}, and adx gives it --${optionName(field)}`);
        const shared = fields
            .filter((field, i) => fields.findIndex(other => optionName(other) === optionName(field)) < i)
            .map(field => `${this.name} has two fields for --${optionName(field)}, one is ${field}`);
        const replaced = sharedWithGlobal(this.spec, this.#global).map(field => `${this.name} has a field ${field}, and so has the global input`);
        return [...adxTaken, ...shared, ...replaced].map(message => declaration.issue(message));
    }
    // --fields alone, or with no name, lists the fields of the answer; else the answer keeps those
    // it names.
    #withFields(input, read, output) {
        const fields = answerFieldsOf(output);
        if (read.listed === 'fields')
            return fieldsListed(fields);
        if (typeof read.adx.fields !== 'string')
            return { input, run: NO_FIELDS };
        const lists = `${this.#call()} --fields`;
        const named = namesOf(read.adx.fields, fields, { command: this.name, lists });
        const [wrong, ...more] = this.#shown(named.issues);
        if (wrong !== undefined)
            return refused([wrong, ...more]);
        if (named.names.length === 0)
            return fieldsListed(fields);
        return { input, run: { dryRun: false, fields: named.names } };
    }
    /**
     * A plan answers the dry run; the real run answers `{ ...planned, ...applied }` (decision 24).
     * With apply, a plan that answers no object leaves no place for apply's fields, so both runs
     * refuse it before apply can send anything.
     */
    async #effect(input, run) {
        const planned = thrownIfRefused(await this.spec.plan?.(input, { refuse }));
        if (this.spec.apply !== undefined && isRecord(planned) === false) {
            const message = `the plan of ${this.name} answered no object, so apply cannot add to it`;
            return refused([declaration.issue(message)]);
        }
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
    #help(fields) {
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
        if (text === undefined || this.kind === 'list')
            return {};
        return { text: (result) => text.call(this.spec, result) };
    }
    // Each of adx's own issues names the call that shows what the command takes.
    #shown(issues) {
        const place = this.places[0];
        if (place === undefined)
            return [...issues];
        const step = {
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
function thrownIfRefused(value) {
    if (value instanceof Refused)
        throw value;
    return value;
}
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
