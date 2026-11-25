/**
 * The calls of conformance: what the tool shows of itself, and every call a probe makes, each
 * with the commands its answer names.
 *
 * Command, Known, Probing: one command as `schema` shows it, the tool as the probes know it, and
 * the record of every call.
 *
 * Every probe call runs in a fresh scratch folder. In the same folder, right after it, runs each
 * command its answer names, in a step or in an issue, word for word as an agent would run it, so
 * a named command carries what it needs, such as the data folder. Each named command runs once
 * per conformance. adx must know it: no issue says the command, an option or a word is unknown.
 * A step that needs nothing more must run as it stands: adx takes its input, and only the tool's
 * own refusal, which depends on the data, may stop it.
 *
 * @example const known = await probing.known();
 */
import {
  ADX_CODES,
  factsOf,
  kitMark,
  noFakeLead,
  NOTHING_CHANGED,
  refusedWith,
  schemaFailed,
} from '../core/index.ts';
import { answerIn, Facts, keysIn, Overview, resultOf, Started } from './answer.schema.ts';
import type { Answer } from './answer.schema.ts';
import type { Asked, Called, Caller, Session } from './caller.ts';
import { wordsOf } from './words.ts';

export type Command = {
  words: string[];
  facts: Facts;
  /** The input of a call that must succeed: the command's example, or {} without a required field. */
  example: Record<string, unknown> | undefined;
};

export type Known = {
  name: string;
  commands: Command[];
  shapes: string[];
  /** The remotes `schema` names, and the codes it lists beside adx's, which the tool made. */
  remotes: string[];
  codes: string[];
  /** The skill the start answer names, or undefined without one. */
  skill: string | undefined;
  /** The words of each group, which lists its commands when called alone. */
  groups: string[][];
  /** What the start answer and `schema` broke, for their probes. */
  started: string[];
  schema: string[];
  /** Each command with a required field and no example, which no probe can call validly. */
  unexampled: string[];
};

/** adx's own codes, so the codes `schema` lists beside them are the tool's. */
const ADX_NAMES = new Set(ADX_CODES.map(made => factsOf(made).code));

/**
 * The codes of an issue that says a call leaves a field open or gives it a value it does not
 * take: a step without needs must give every field it needs a fitting value. A definition, from
 * adx's own codes in the guide's "What every tool gets". A refusal of the tool's own, such as
 * an item the fake does not know, depends on the data and does not count.
 */
const UNFIT_INPUT = new Set(['SCHEMA', 'MISSING_VALUE', 'NOT_IN_LIST']);

/**
 * The codes of an issue that says adx does not know a call: the command, an option, a word, a
 * value of a switch, an option given twice, or --json. A definition, from adx's own codes in the
 * guide's "What every tool gets".
 */
const UNKNOWN_CALL = new Set([
  'UNKNOWN_COMMAND',
  'OPTION_BEFORE_COMMAND',
  'UNKNOWN_OPTION',
  'UNEXPECTED_ARGUMENT',
  'UNEXPECTED_VALUE',
  'REPEATED_OPTION',
  'INVALID_JSON',
  'MISSING_INPUT',
]);

export class Probing {
  readonly calls: Called[] = [];
  /** The calls of the commands answers named, a part of `calls` that belongs to no probe. */
  readonly namedCalls: Called[] = [];
  /** What the commands the answers named broke. */
  readonly named: string[] = [];
  readonly #caller: Caller;
  readonly #ran = new Set<string>();
  #name = '';
  #commands: readonly Command[] = [];
  #unfaked: readonly string[] = [];

  constructor(caller: Caller) {
    this.#caller = caller;
  }

  /**
   * @returns the tool as the start answer and `schema` show it
   * @throws a refusal SCHEMA at `command` when neither the start answer nor `schema` names the
   * tool, since no probe can run then
   */
  async known(): Promise<Known> {
    // The name first, since every command an answer names begins with it: from the start
    // answer, else from the commands `schema` lists, so a broken start answer is a finding.
    const first = await this.alone({ argv: [] });
    const listed = await this.alone({ argv: ['schema'] });
    const [command] = resultOf(answerIn(listed.out).answer, Overview)?.commands ?? [];
    const name =
      resultOf(answerIn(first.out).answer, Started)?.name ?? command?.command.split(' ')[0];
    if (name === undefined) {
      const message = 'neither the tool called alone nor its schema answers as a tool of adx does';
      throw refusedWith([schemaFailed.at('command', message)], NOTHING_CHANGED);
    }
    this.#name = name;
    const start = await this.ask({ argv: [] });
    const schema = await this.ask({ argv: ['schema'] });
    const overview = resultOf(answerIn(schema.out).answer, Overview);
    // One call after another, so the requests a fake hears belong to the call that runs.
    const commands: Command[] = [];
    const shown: Called[] = [];
    const unread: string[] = [];
    for (const { command } of overview?.commands ?? []) {
      const words = command.split(' ').slice(1);
      const called = await this.ask({ argv: ['schema', ...words] });
      shown.push(called);
      const facts = resultOf(answerIn(called.out).answer, Facts);
      if (facts === undefined) unread.push(`${this.line(called)} answers no facts of the command`);
      else commands.push(commandOf(words, facts));
    }
    this.#commands = commands;
    const remotes = overview?.remotes ?? [];
    this.#unfaked = remotes.filter(remote => this.#caller.faked.includes(remote) === false);
    const shapes = overview?.shapes ?? [];
    for (const shape of shapes) shown.push(await this.ask({ argv: ['schema', shape] }));
    return {
      name,
      commands,
      shapes,
      remotes,
      codes: (overview?.codes ?? [])
        .map(({ code }) => code)
        .filter(code => ADX_NAMES.has(code) === false),
      skill: resultOf(answerIn(first.out).answer, Started)?.skill ?? undefined,
      groups: groupsOf(commands.map(command => command.words)),
      started: refusedOf([start]),
      unexampled: commands
        .filter(command => command.example === undefined)
        .map(known => [name, ...known.words].join(' ')),
      schema: [
        ...refusedOf([schema, ...shown]),
        ...unread,
        ...(overview === undefined ? [`${this.line(schema)} answers no list of commands`] : []),
      ],
    };
  }

  /** @returns the call in a fresh scratch folder, after each command its answer names ran there */
  ask(asked: Asked): Promise<Called> {
    return this.#caller.session(async session => {
      const called = await session.call(asked);
      this.calls.push(called);
      await this.#namedIn(session, called);
      return called;
    });
  }

  /** @returns a call in a fresh scratch folder that no later check reads, such as one in text */
  alone(asked: Asked): Promise<Called> {
    return this.#caller.session(session => session.call(asked));
  }

  /**
   * The closed network of the kit refuses a request to a remote without a fake, so such a call
   * shows nothing of the rule it probes, and counts as not probed. Its message ends with the
   * kit's token, which no program can guess, so a refusal the program prints itself still counts.
   *
   * @returns the remote without a fake that refused the call, or undefined
   */
  unreached(called: Called) {
    const issues = answerIn(called.out).answer?.issues ?? [];
    const mark = kitMark(this.#caller.closedBy);
    return this.#unfaked.find(remote =>
      issues.some(
        ({ code, message }) =>
          code === 'DECLARATION' &&
          message.startsWith(noFakeLead(remote)) &&
          message.endsWith(mark),
      ),
    );
  }

  /** The remotes `schema` names that no fake stands for. */
  get unfaked() {
    return this.#unfaked;
  }

  /** @returns each code an answer of a call so far raised */
  raised() {
    return new Set(
      this.calls
        .flatMap(called => answerIn(called.out).answer?.issues ?? [])
        .map(issue => issue.code),
    );
  }

  /** Which folders a call's `changed` covers. */
  get watched() {
    return this.#caller.watched;
  }

  /** @returns the call as an agent would type it, the tool's name first */
  line(called: Asked) {
    return this.wordsOf(called).join(' ');
  }

  /** @returns the words of the call, the tool's name first */
  wordsOf(called: Asked) {
    return [this.#name, ...called.argv];
  }

  async #namedIn(session: Session, called: Called) {
    const { answer } = answerIn(called.out);
    const steps = (answer?.next ?? []).flatMap(({ command, needs }) =>
      command === undefined ? [] : [{ command, runs: needs === undefined }],
    );
    const issues = (answer?.issues ?? []).flatMap(({ command }) =>
      command === undefined ? [] : [{ command, runs: false }],
    );
    for (const { command, runs } of [...steps, ...issues]) {
      if (this.#ran.has(command)) continue;
      this.#ran.add(command);
      this.named.push(...(await this.#namedFindings(session, called, command, runs)));
    }
  }

  // A step without needs runs as it stands; any other named command adx must at least know.
  async #namedFindings(session: Session, called: Called, command: string, runs: boolean) {
    const said = `${this.line(called)} names ${command}`;
    const words = wordsOf(command);
    if (words === undefined) return [`${said}, which is no plain call of one program`];
    const [program, ...argv] = words;
    if (program !== this.#name) return [`${said}, which does not call ${this.#name}`];
    const named = await session.call({ argv });
    this.calls.push(named);
    this.namedCalls.push(named);
    const { answer } = answerIn(named.out);
    const unknown = (answer?.issues ?? []).filter(issue => UNKNOWN_CALL.has(issue.code));
    if (unknown.length > 0) return [`${said}, and adx does not know it: ${messagesOf(unknown)}`];
    const unfit = (answer?.issues ?? []).filter(issue => UNFIT_INPUT.has(issue.code));
    if (runs && unfit.length > 0)
      return [`${said}, which does not run as it stands: ${messagesOf(unfit)}`];
    const given = givenIn(argv, this.#commands);
    const wrong = unfit.filter(issue => given.has(issue.path?.split('.')[0] ?? ''));
    if (wrong.length > 0)
      return [`${said}, which gives a value it does not take: ${messagesOf(wrong)}`];
    return [];
  }
}

/**
 * A command that still needs fields leaves them open; a value it gives must fit all the same.
 *
 * @param argv - the words of a named call after the tool's name
 * @param commands - the commands of the tool, as `schema` shows them
 * @returns each field the call gives a value, by an option with its value or in --json
 */
function givenIn(argv: readonly string[], commands: readonly Command[]) {
  const command = commands.find(known => known.words.every((word, i) => argv[i] === word));
  const given = new Set<string>();
  if (command === undefined) return given;
  const rest = argv.slice(command.words.length);
  for (const [at, word] of rest.entries()) {
    const [option = '', inline] = word.split(/=(.*)/s);
    const value = inline ?? rest[at + 1];
    if (option === '--json') keysIn(value).forEach(field => given.add(field));
    const field = command.facts.fields.find(known => known.option === option);
    const valued =
      value !== undefined && (inline !== undefined || value.startsWith('--') === false);
    if (field !== undefined && valued) given.add(field.field);
  }
  return given;
}

// A call with the example must succeed; a command without one is called with {} only when it
// has no required field.
function commandOf(words: string[], facts: Facts): Command {
  const required = facts.fields.some(field => field.required === true);
  const example = isRecord(facts.example) ? facts.example : required ? undefined : {};
  return { words, facts, example };
}

/** @returns each call that was refused, with its first issue */
function refusedOf(calls: readonly Called[]) {
  return calls.flatMap(called => {
    const { answer } = answerIn(called.out);
    return called.exit === 0 && answer?.ok === true
      ? []
      : [`${called.argv.join(' ')}: ${firstOf(answer)}`];
  });
}

/** @returns the first issue of an answer, or what stands in place of one */
export const firstOf = (answer: Answer | undefined) => {
  const [issue] = answer?.issues ?? [];
  if (answer === undefined) return 'no answer';
  return issue === undefined ? 'no issue' : `${issue.code} ${issue.message}`;
};

const messagesOf = (issues: Answer['issues'] & object) =>
  issues.map(issue => `${issue.code} ${issue.message}`).join('; ');

// Every leading part of a command's words that is no command itself.
function groupsOf(commands: readonly string[][]) {
  const lines = new Set(commands.map(words => words.join(' ')));
  const groups = commands.flatMap(words => words.slice(1).map((_, i) => words.slice(0, i + 1)));
  const unique = new Map(groups.map(words => [words.join(' '), words]));
  return [...unique.values()].filter(words => lines.has(words.join(' ')) === false);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;
