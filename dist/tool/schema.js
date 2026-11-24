/**
 * adx's own command `schema`: what every command takes, the shapes, the kinds and the codes.
 *
 * namesSchema, schemaAnswer: whether a call names `schema`, and its answer.
 * schemaTargetOf: the shape or the command a name after `schema` shows.
 *
 * `schema` alone names every command with its input, the shapes, the roots with their variable
 * and option, the variables of the remotes, never their values, the stored kinds with the
 * format number each is written in, what each kind asks the caller and adx's own codes. `schema <command>` shows the
 * input as JSON Schema with what --help shows, and of a list its item, key, outline and page
 * size; `schema <shape>` shows the shape. Each prints the JSON Schema of the same Zod schema adx
 * checks with, so the two never differ. `schema` comes before the command table, and takes no
 * option.
 *
 * @example if (namesSchema(tokens)) return schemaAnswer(shell, tokens);
 */
import { refused, runnersIn } from "../command/index.js";
import { ADX_CODES, exitOf, factsOf, unknownCommand, unknownOption } from "../core/index.js";
import { rootOptions } from "../files/index.js";
import { variablesOf } from "../remote/index.js";
import { jsonSchemaOf } from "../shapes/index.js";
/** The word of adx's own command. */
const SCHEMA = 'schema';
/** What each kind asks the caller to do, in the order of the guide's table of kinds. */
const KINDS = [
    ['fix', 'the caller fixes the input: change the call and run it again'],
    ['ask', 'only the person can solve it: stop and ask'],
    ['retry', 'a later call may succeed: call again later'],
    ['bug', 'the tool broke: stop and tell the person'],
];
/** @returns whether the first word of the call is `schema` */
export const namesSchema = (tokens) => tokens.find(token => token.kind === 'positional')?.value === SCHEMA;
/**
 * @param shell - what the call reads of the tool
 * @param tokens - every token of the call
 * @returns the answer of `schema`, or the refusal of an option or of a name it does not know
 */
export function schemaAnswer(shell, tokens) {
    const every = {
        does: 'shows every command and its input',
        command: `${shell.name} schema`,
    };
    const [option, ...more] = optionIssues(tokens, every);
    if (option !== undefined)
        return refused([option, ...more]);
    const name = wordsAfter(tokens).join(' ');
    if (name === '')
        return answer(overviewOf(shell));
    const target = schemaTargetOf(shell, name);
    if (target === undefined)
        return refused([unknownName(name, every)]);
    if (target.shape !== undefined)
        return answer({ shape: jsonSchemaOf(target.shape, 'input') });
    return answer(commandSchemaOf(target.runner));
}
/**
 * Where a shape and a group share a word, the word names the shape (decision 72).
 *
 * @param shell - what the call reads of the tool
 * @param name - a shape, or a command by its words, such as `profile set`
 * @returns the shape or the command, or undefined for a name `schema` does not know
 */
export function schemaTargetOf(shell, name) {
    const shape = Object.hasOwn(shell.shapes, name) ? shell.shapes[name] : undefined;
    if (shape !== undefined)
        return { shape };
    const runner = [...runnersIn(shell.commands)].find(listed => listed.name === name);
    return runner === undefined ? undefined : { runner };
}
function overviewOf(shell) {
    const commands = [...runnersIn(shell.commands)].map(runner => ({
        command: `${shell.name} ${runner.name}`,
        does: runner.does,
        input: jsonSchemaOf(runner.input, 'input'),
    }));
    const kinds = Object.fromEntries(KINDS.map(([kind, does]) => [kind, { exit: exitOf({ ok: false, kind }), does }]));
    const roots = rootOptions(shell.roots).map(({ name, variable }) => ({
        root: name,
        ...(variable === undefined ? {} : { variable, option: `--${name}` }),
    }));
    const variables = shell.remotes.flatMap(variablesOf);
    const stored = shell.stored.map(({ name, version }) => ({ name, version }));
    const codes = ADX_CODES.map(factsOf);
    const shapes = Object.keys(shell.shapes);
    return { commands, shapes, roots, variables, stored, kinds, codes };
}
function commandSchemaOf(runner) {
    const { command, does, ...facts } = runner.schemaFacts();
    const output = runner.output();
    const item = runner.item();
    return {
        command,
        does,
        input: jsonSchemaOf(runner.input, 'input'),
        ...facts,
        ...(item === undefined ? {} : { item: jsonSchemaOf(item, 'output') }),
        ...(output === undefined ? {} : { output: jsonSchemaOf(output, 'output') }),
    };
}
const answer = (result) => ({ answer: { ok: true, result } });
// The words after `schema`, which name a shape or a command.
const wordsAfter = (tokens) => tokens.flatMap(token => (token.kind === 'positional' ? [token.value] : [])).slice(1);
const optionIssues = (tokens, every) => tokens
    .filter(token => token.kind !== 'positional')
    .map(token => unknownOption.at(pathOf(token), `schema takes no option ${rawOf(token)}`).command(every));
const unknownName = (name, every) => unknownCommand
    .issue(`${every.command} knows no ${name}: it shows a command or a shape`)
    .command(every);
const rawOf = (token) => (token.kind === 'option' ? token.rawName : '--');
const pathOf = (token) => (token.kind === 'option' ? token.name : '--');
