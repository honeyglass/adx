/**
 * The command adxcheck: the checks of conformance against a program, as a report or a refusal.
 *
 * adxcheck: one call of adxcheck, from its arguments to what it writes and its exit code.
 *
 * `adxcheck report [options] -- <command line>` answers one line per Agent DX rule and exits 0.
 * `adxcheck run` refuses with exit 1, one issue per rule that a probe broke, each with the call
 * that showed it in its message; with every probed rule met it answers the same lines and exits
 * 0. The options are the samples of conformance that a command line can give: `--env NAME=value`,
 * repeatable, `--seed <folder>` and `--skill-file <path>` (decision 86), and `--output`. adxcheck
 * answers as a tool of adx does: JSON when piped, text at a terminal or with `--output text`,
 * and called alone or with `--help`, what it takes.
 *
 * A fake is a value of a test, so adxcheck has none, and the network of the program stays closed
 * to every request through an adx remote: such a call leaves its rule not probed. The skill is
 * checked only with --skill-file, in a scratch home, so adxcheck never reads the person's own.
 * The issue of a broken rule names no call of the checked tool as its command: that call would
 * run the real tool, with the real home and network. It names adxcheck run again.
 *
 * @example const ran = await adxcheck(['report', '--', 'node', 'bin/tracker.ts'], false);
 */
import { $try } from '@honeyglass/utils/ts';
import {
  answerOfError,
  answerOfRefused,
  code,
  exitOf,
  fileNotFound,
  missingValue,
  notAFolder,
  NOTHING_CHANGED,
  refusedWith,
  repeatedOption,
  schemaFailed,
  unexpectedArgument,
  unknownCommand,
  unknownOption,
  withHint,
} from '../core/index.ts';
import type { Answer, Issue, Ran } from '../core/index.ts';
import { disk } from '../node/index.ts';
import { lineOf } from '../steps/index.ts';
import { textOf } from '../tool/index.ts';
import type { Cleanup } from './caller.ts';
import { checksOf } from './checks.ts';
import { REPORT_GAP, REPORT_NAME, REPORT_STATUS } from './limits.ts';
import { kitVariableIssues } from './program.ts';
import { ruleLines } from './rules.ts';
import type { Outcome, RuleLine } from './rules.ts';
import type { Samples } from './run.ts';

/** The code of a rule that a probe of adxcheck run broke. */
const ruleNotMet = code('RULE_NOT_MET', 'fix', 'Fix what the call shows, then run adxcheck again');

type Mode = 'report' | 'run';

type Form = 'text' | 'json' | undefined;

type Asked = { mode: Mode; samples: Samples; words: string[]; form: Form };

type Read = Asked | { started: true } | { issues: Issue[]; form: Form };

/** The options of adxcheck that take a value; a definition, from the guide's adxcheck section. */
const VALUED = ['env', 'seed', 'skill-file', 'output'];

/** A variable of --env: a name a shell takes, an equals sign, and any value. */
const ENV = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;

/** A control character, which a terminal would act on. */
const CONTROL = /\p{Cc}/gu;

const STARTED = {
  name: 'adxcheck',
  does: 'checks a tool built on adx against the Agent DX rules, as a program',
  skill: null,
  commands: [
    { command: 'adxcheck report', does: 'answers one line per rule, and exits 0' },
    { command: 'adxcheck run', does: 'refuses with one issue per rule a probe broke' },
  ],
};

const FIRST_STEP = {
  does: 'reports on a tool, its command line after --, such as -- node bin/tool.ts',
  command: 'adxcheck report',
  needs: ['command'],
};

/**
 * @param args - the arguments after the program
 * @param tty - whether stdout is a terminal, so the answer is text
 * @returns the exit code and what adxcheck writes to stdout and stderr; it never rejects
 */
export async function adxcheck(args: readonly string[], tty: boolean): Promise<Ran> {
  const asked = askedOf(args);
  if ('started' in asked) return written({ ok: true, result: STARTED, next: [FIRST_STEP] }, tty);
  if ('issues' in asked) return refusal(asked.issues, formOf(asked.form, tty));
  const text = formOf(asked.form, tty);
  const { data, error } = await $try(() => linesOf(asked));
  if (error !== null) {
    const { answer, err } = answerOfError(error);
    return { ...written(answer, text), err };
  }
  const broken = data.filter(line => line.status === 'failed');
  if (asked.mode === 'run' && broken.length > 0) {
    const again = lineOf(['adxcheck', ...args]);
    return refusal(
      broken.map(line => issueOf(line, again)),
      text,
    );
  }
  const rules = data.map(({ rule, status, reason }) => ({
    rule,
    status,
    ...(reason === undefined ? {} : { reason }),
  }));
  if (text) return { exit: 0, out: reportOf(data), err: '' };
  return written({ ok: true, result: { rules } }, false);
}

// Every mistake of the call comes back in one answer, as adx answers its own.
function askedOf(args: readonly string[]): Read {
  const cut = args.indexOf('--');
  const words = cut === -1 ? [] : args.slice(cut + 1);
  const before = cut === -1 ? args : args.slice(0, cut);
  if (before.length === 0 || before.includes('--help')) return { started: true };
  const [mode, ...options] = before;
  const read = optionsOf(options);
  const issues = [...modeIssues(mode), ...read.issues];
  if (words.length === 0) {
    const message = `adxcheck ${mode ?? 'report'} needs the command line of the tool after --`;
    issues.push(schemaFailed.at('command', message));
  }
  if (issues.length > 0 || (mode !== 'report' && mode !== 'run'))
    return { issues, form: read.form };
  return { mode, samples: read.samples, words, form: read.form };
}

function modeIssues(mode: string | undefined) {
  if (mode === 'report' || mode === 'run') return [];
  return [unknownCommand.issue(`adxcheck has no command ${mode ?? ''}: it takes report or run`)];
}

// An option takes its value as the next word or after =, as adx reads the options of a tool.
function optionsOf(options: readonly string[]) {
  const issues: Issue[] = [];
  const env: Record<string, string> = {};
  const once: Record<string, string> = {};
  let at = 0;
  while (at < options.length) {
    const word = options[at] ?? '';
    at += 1;
    if (word.startsWith('--') === false) {
      issues.push(unexpectedArgument.issue(`adxcheck takes no word ${word} before --`));
      continue;
    }
    const [name = '', inline] = word.slice(2).split(/=(.*)/s);
    const next = options[at];
    const taken = inline === undefined && next !== undefined && next.startsWith('--') === false;
    const value = inline ?? (taken ? next : undefined);
    if (taken) at += 1;
    issues.push(...optionIssues(name, value, { env, once }));
  }
  issues.push(...kitVariableIssues(env), ...seedIssues(once.seed));
  const samples: Samples = {
    env,
    ...(once.seed === undefined ? {} : { seed: once.seed }),
    ...(once['skill-file'] === undefined ? {} : { skillFile: once['skill-file'] }),
  };
  const form: Form = once.output === 'text' || once.output === 'json' ? once.output : undefined;
  return { issues, samples, form };
}

// Each option fills its place in the samples, or answers what is wrong with it.
function optionIssues(
  name: string,
  value: string | undefined,
  into: { env: Record<string, string>; once: Record<string, string> },
): Issue[] {
  if (VALUED.includes(name) === false)
    return [unknownOption.at(name, `adxcheck has no option --${name}`)];
  if (value === undefined) return [missingValue.at(name, `--${name} needs a value`)];
  if (name === 'env') return envIssues(value, into.env);
  if (name === 'output' && value !== 'text' && value !== 'json')
    return [schemaFailed.at('output', `--output takes text or json, and ${value} is neither`)];
  if (Object.hasOwn(into.once, name)) return [repeatedOption.at(name, `--${name} came twice`)];
  into.once[name] = value;
  return [];
}

function envIssues(value: string, env: Record<string, string>): Issue[] {
  const [, variable, text] = ENV.exec(value) ?? [];
  if (variable === undefined || text === undefined)
    return [schemaFailed.at('env', `--env takes NAME=value, and ${value} is none`)];
  if (Object.hasOwn(env, variable))
    return [repeatedOption.at('env', `--env gives ${variable} twice`)];
  env[variable] = text;
  return [];
}

// The seed is copied into every probe, so a seed that is no folder would break each of them.
function seedIssues(seed: string | undefined): Issue[] {
  if (seed === undefined) return [];
  const real = disk.real(seed);
  if (real === undefined) return [fileNotFound.at('seed', `the seed ${seed} is not there`)];
  if (disk.entry(real) === 'folder') return [];
  return [notAFolder.at('seed', `the seed ${seed} is no folder`)];
}

// Every check runs; a program the kit cannot read refuses, and closes what it opened.
async function linesOf(asked: Asked) {
  const cleanups: (() => void)[] = [];
  const cleanup: Cleanup = { after: run => cleanups.push(run) };
  const { data, error } = await $try(async () => {
    const outcomes = new Map<string, Outcome>();
    for (const check of await checksOf(cleanup, asked.words, asked.samples))
      outcomes.set(check.name, await check.outcome());
    return outcomes;
  });
  for (const run of cleanups) run();
  if (error !== null) throw error;
  return ruleLines(withSkillFile(data, asked.samples));
}

// Without a skill file the check cannot run, and that is no failure of the tool (decision 86).
function withSkillFile(outcomes: Map<string, Outcome>, samples: Samples) {
  const skill = outcomes.get('agent skill');
  if (samples.skillFile !== undefined || skill?.subject !== true) return outcomes;
  return new Map([...outcomes, ['agent skill', { subject: true, todo: 'pass --skill-file' }]]);
}

// The finding begins with the call that broke the rule, as text: running it would run the tool.
function issueOf({ rule, reason, finding, next }: RuleLine, again: string) {
  const issue = withHint(ruleNotMet.issue(`${rule}: ${finding ?? reason ?? ''}`), next ?? '');
  return issue.command({ does: 'checks the tool again', command: again });
}

// The names stand in one column, as wide as the longest needs, and the statuses in another.
function reportOf(lines: readonly RuleLine[]) {
  const width = Math.max(REPORT_NAME, ...lines.map(({ rule }) => rule.length + REPORT_GAP));
  const rows = lines.map(({ rule, status, reason }) => {
    const shown = reason?.replace(CONTROL, escapedChar);
    return shown === undefined
      ? `${rule.padEnd(width)}${status}`
      : `${rule.padEnd(width)}${status.padEnd(REPORT_STATUS)}${shown}`;
  });
  return `${rows.join('\n')}\n`;
}

const escapedChar = (char: string) => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`;

// The form --output forces, else text at a terminal.
const formOf = (form: Form, tty: boolean) => (form === undefined ? tty : form === 'text');

function refusal(issues: readonly Issue[], text: boolean): Ran {
  const [first, ...rest] = issues;
  if (first === undefined) return { exit: 0, out: '', err: '' };
  const { answer } = answerOfRefused(refusedWith([first, ...rest], NOTHING_CHANGED));
  return written(answer, text);
}

// Text at a terminal, else one JSON document, as a tool of adx answers.
const written = (answer: Answer<unknown>, text: boolean): Ran => ({
  exit: exitOf(answer),
  out: text ? textOf(answer) : `${JSON.stringify(answer)}\n`,
  err: '',
});
