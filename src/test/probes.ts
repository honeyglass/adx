/**
 * The probes of conformance: each checks one behavior of the Agent DX rules on every command.
 *
 * Probe, PROBES: a probe, its name, what to do when it fails, and the findings of its calls; all
 * of them, in the order they run.
 *
 * The probes that call come first. The last ones read every call made before them: each answer
 * is one JSON document, each exit code fits its answer, each named command runs, and a read
 * without `output` answers no long list or large document. The valid calls come from the
 * examples `schema` shows, so the fakes and the seed must answer them. A call that the kit's
 * closed network refused, since no fake stands for its remote, breaks no rule: the probe that
 * made it is not probed in full, and says so, as does a probe that cannot see what it needs,
 * such as the sends of a remote without a fake, or the hint of a code no call raised.
 *
 * @example for (const probe of PROBES) findings.push(...(await probe.findings(probing, known)));
 */
import { largeness } from '../core/index.ts';
import { byteLength } from '../node/index.ts';
import { answerIn } from './answer.schema.ts';
import type { Called } from './caller.ts';
import { PROBE } from './limits.ts';
import { firstOf } from './probing.ts';
import type { Command, Known, Probing } from './probing.ts';

export type Probe = {
  name: string;
  /** What the author does when the probe fails. */
  next: string;
  /** Whether it calls a command only with its example, so it leaves out one without. */
  example?: true;
  /** Why the tool gives it nothing to call, such as no effect for the dry runs; else undefined. */
  idle?: (known: Known) => string | undefined;
  /** Why it could not probe all it calls, read once it ran, such as a fake missing; else undefined. */
  unprobed?: (probing: Probing, known: Known) => string | undefined;
  /** The calls that are its own, when they are no calls it made itself. */
  calls?: (probing: Probing) => readonly Called[];
  findings: (probing: Probing, known: Known) => Promise<string[]>;
};

export const PROBES: readonly Probe[] = [
  {
    name: 'start answer',
    next: 'run the tool alone and fix what it answers',
    findings: async (_, known) => known.started,
  },
  {
    name: 'schema at run time',
    next: 'run the schema of each command and fix what it answers',
    findings: async (_, known) => known.schema,
  },
  {
    name: 'raw JSON input',
    next: 'give each command an example that succeeds, and fakes and a seed that answer it',
    findings: rawJson,
  },
  {
    name: 'dry runs',
    next: 'stage files in plan and send in apply only, through adx, never straight to the disk or the network',
    example: true,
    idle: known => (withExample(known).some(isEffect) ? undefined : 'no effect to dry-run'),
    unprobed: (probing, known) =>
      probing.unfaked.length === 0 || withExample(known).some(isEffect) === false
        ? undefined
        : `no recorder for ${quotedNames(probing.unfaked)}: pass a fake to probe sends`,
    findings: dryRuns,
  },
  {
    name: 'nothing passes silently',
    next: 'let adx read the arguments and the input, and refuse in the handler what it does not know',
    example: true,
    findings: unknowns,
  },
  {
    name: 'options that list',
    next: 'give each field whose option lists values a source that answers them',
    idle: known =>
      known.commands.some(command => command.facts.lists.length > 0)
        ? undefined
        : 'no option that lists values',
    findings: listing,
  },
  {
    name: 'values outside a list',
    next: 'give each issue at a field with a list the command that lists its values',
    example: true,
    idle: known =>
      withExample(known).some(command => command.facts.lists.length > 0)
        ? undefined
        : 'no field with a list',
    findings: outside,
  },
  {
    name: 'input hardening',
    next: 'keep every text field a string adx checks, such as z.string(), id() or a path',
    example: true,
    idle: known =>
      withExample(known).some(command => command.facts.fields.some(f => f.takes === 'text'))
        ? undefined
        : 'no text field to probe',
    findings: hardening,
  },
  {
    name: '--replace',
    next: 'add replace: false to an effect that writes no file with files.write',
    example: true,
    idle: known =>
      withExample(known).filter(isEffect).some(takesReplace)
        ? undefined
        : 'no effect that takes --replace',
    findings: replacing,
  },
  {
    name: 'JSON when piped',
    next: 'return the value and let adx write it; write logs to stderr, such as with console.error',
    findings: piped,
  },
  {
    name: 'exit codes',
    next: 'fix the bug the error names, or refuse with a code of the tool',
    unprobed: probing => {
      const unreached = probing.calls.filter(called => reached(probing, called) === false);
      if (unreached.length === 0) return undefined;
      return `${countOf(unreached.length)} reached ${quotedNames(probing.unfaked)}, which no fake stands for, so their exit codes show nothing`;
    },
    findings: exits,
  },
  {
    name: 'hints that run',
    next: 'name steps with step() of a listed command, and commands adx knows',
    unprobed: (probing, known) => {
      const raised = probing.raised();
      const never = known.codes.filter(code => raised.has(code) === false);
      if (never.length === 0) return undefined;
      return `${never.join(', ')} ${never.length === 1 ? 'was' : 'were'} never raised`;
    },
    calls: probing => probing.namedCalls,
    findings: async probing => probing.named,
  },
  {
    name: 'large answers',
    next: 'give a read that answers a long list or a large document an output schema',
    idle: known => (unbounded(known).length > 0 ? undefined : 'no read without an output schema'),
    unprobed: (probing, known) => {
      const calls = callsOf(probing, unbounded(known));
      const answered = calls.some(called => answerIn(called.out).answer?.ok === true);
      if (unbounded(known).length === 0 || answered) return undefined;
      return 'no read without an output schema answered';
    },
    findings: large,
  },
];

async function rawJson(probing: Probing, known: Known) {
  const findings = known.unexampled.map(
    line => `${line} has a required field and no example, so no probe can call it validly`,
  );
  for (const command of withExample(known)) {
    const called = await probing.ask(exampleCall(command));
    if (called.exit !== 0 && reached(probing, called)) findings.push(refused(probing, called));
  }
  return findings;
}

async function dryRuns(probing: Probing, known: Known) {
  const findings: string[] = [];
  for (const command of withExample(known).filter(isEffect)) {
    const called = await probing.ask(exampleCall(command, ['--dry-run']));
    const { answer } = answerIn(called.out);
    const line = probing.line(called);
    if (called.exit !== 0 && reached(probing, called)) findings.push(refused(probing, called));
    if (called.exit === 0 && answer?.applied !== false) findings.push(`${line} applied it`);
    if (called.changed.length > 0)
      findings.push(`${line} changed ${called.changed.join(', ')} (${probing.watched})`);
    const sends = called.sent.filter(route => route.startsWith('GET ') === false);
    if (sends.length > 0) findings.push(`${line} sent ${sends.join(', ')}`);
  }
  return findings;
}

// A word no tool knows, as a command, an option, a stray word and a field, and a group alone.
async function unknowns(probing: Probing, known: Known) {
  const findings = await refusedWith(probing, [PROBE], ['UNKNOWN_COMMAND']);
  for (const command of known.commands) {
    const argv = [...command.words, `--${PROBE}`, 'x', PROBE];
    findings.push(...(await refusedWith(probing, argv, ['UNKNOWN_OPTION', 'UNEXPECTED_ARGUMENT'])));
  }
  for (const command of withExample(known)) {
    const input = { ...command.example, [PROBE]: 1 };
    const called = await probing.ask(inputCall(command, input));
    const issues = answerIn(called.out).answer?.issues ?? [];
    if (issues.some(issue => issue.code === 'SCHEMA' && issue.path === PROBE) === false)
      findings.push(`${probing.line(called)} took the field ${PROBE}`);
  }
  for (const words of known.groups) {
    const called = await probing.ask({ argv: words });
    if (called.exit !== 0)
      findings.push(
        `${probing.line(called)} lists no commands: ${firstOf(answerIn(called.out).answer)}`,
      );
  }
  return findings;
}

// All mistakes of one call come back in one answer (rule 7).
async function refusedWith(probing: Probing, argv: string[], codes: readonly string[]) {
  const called = await probing.ask({ argv });
  const issues = answerIn(called.out).answer?.issues ?? [];
  const missing = codes.filter(code => issues.some(issue => issue.code === code) === false);
  return missing.length === 0
    ? []
    : [`${probing.line(called)} was not refused with ${missing.join(' and ')}`];
}

// An option alone lists its values, or names the fields its list needs first; one without a
// list is refused as an option without its value.
async function listing(probing: Probing, known: Known) {
  const findings: string[] = [];
  for (const command of known.commands) {
    for (const field of command.facts.fields) {
      if (field.option === undefined || field.takes === 'switch') continue;
      const called = await probing.ask({ argv: [...command.words, field.option] });
      const issues = answerIn(called.out).answer?.issues ?? [];
      const listed = command.facts.lists.includes(field.field);
      const missing = issues.every(issue => issue.code === 'MISSING_VALUE');
      const line = probing.line(called);
      if (listed && called.exit !== 0 && missing === false && reached(probing, called))
        findings.push(`${line} lists no values: ${messages(issues)}`);
      if (listed === false && (called.exit !== 1 || missing === false))
        findings.push(`${line} was not refused with MISSING_VALUE`);
    }
  }
  return findings;
}

async function outside(probing: Probing, known: Known) {
  const findings: string[] = [];
  for (const command of withExample(known)) {
    for (const field of command.facts.fields.filter(f => command.facts.lists.includes(f.field))) {
      const value = field.repeats === true ? [PROBE] : PROBE;
      const called = await probing.ask(
        inputCall(command, { ...command.example, [field.field]: value }),
      );
      const issues = (answerIn(called.out).answer?.issues ?? []).filter(issue =>
        atField(issue.path, field.field),
      );
      const bare = issues.filter(issue => issue.command === undefined);
      if (bare.length > 0)
        findings.push(`${probing.line(called)} names no command for ${messages(bare)}`);
    }
  }
  return findings;
}

// Every text field takes one visible line, so a control character is refused at the field.
async function hardening(probing: Probing, known: Known) {
  const findings: string[] = [];
  for (const command of withExample(known)) {
    for (const field of command.facts.fields.filter(f => f.takes === 'text')) {
      const text = `${PROBE}\u0007`;
      const value = field.repeats === true ? [text] : text;
      const called = await probing.ask(
        inputCall(command, { ...command.example, [field.field]: value }),
      );
      const issues = answerIn(called.out).answer?.issues ?? [];
      if (called.exit !== 1 || issues.some(issue => atField(issue.path, field.field)) === false)
        findings.push(`${probing.line(called)} took a control character in ${field.field}`);
    }
  }
  return findings;
}

async function replacing(probing: Probing, known: Known) {
  const findings: string[] = [];
  for (const command of withExample(known).filter(isEffect).filter(takesReplace)) {
    const called = await probing.ask(exampleCall(command, ['--dry-run', '--replace']));
    const issues = answerIn(called.out).answer?.issues ?? [];
    if (issues.some(issue => issue.code === 'UNKNOWN_OPTION' && issue.path === 'replace'))
      findings.push(
        `${probing.line(called)}: its plan stages no files.write, so --replace guards nothing`,
      );
  }
  return findings;
}

// Each answer so far, and --output, which forces the form, also into text when piped.
async function piped(probing: Probing) {
  const findings = probing.calls.flatMap(called => {
    const { answer, beside } = answerIn(called.out);
    const line = probing.line(called);
    if (answer === undefined)
      return [`${line} answered no JSON document: ${called.out.slice(0, 200)}`];
    if (beside === '') return [];
    const bytes = byteLength(beside);
    return [`${line} wrote ${bytes} bytes to stdout beside its answer:\n${beside.split('\n')[0]}`];
  });
  const text = await probing.alone({ argv: ['schema', '--output', 'text'] });
  if (text.exit !== 0 || answerIn(text.out).answer !== undefined)
    findings.push(`${probing.line(text)} answered no text`);
  const other = await probing.alone({ argv: ['schema', '--output', PROBE] });
  if (other.exit !== 1) findings.push(`${probing.line(other)} was not refused`);
  return findings;
}

async function exits(probing: Probing) {
  return probing.calls
    .filter(called => reached(probing, called))
    .flatMap(called => {
      const { answer } = answerIn(called.out);
      const line = probing.line(called);
      if (called.exit === null) return [`${line} did not end in time`];
      if (called.exit === 2)
        return [`${line} broke: ${firstOf(answer)}\n${called.err.split('\n')[0]}`];
      if (answer === undefined) return [];
      const expected = answer.ok ? 0 : answer.kind === 'bug' ? 2 : 1;
      return called.exit === expected
        ? []
        : [`${line} exited ${called.exit} for kind ${answer.kind ?? 'ok'}`];
    });
}

// Only the calls a probe made of a known command count: their kind tells a read without output.
async function large(probing: Probing, known: Known) {
  return callsOf(probing, unbounded(known)).flatMap(called => {
    const { answer } = answerIn(called.out);
    if (answer?.ok !== true) return [];
    const said = largeness(answer.result, called.out);
    return said.length === 0 ? [] : [`${probing.line(called)} answers ${said.join(' ')}`];
  });
}

const unbounded = (known: Known) =>
  known.commands.filter(isRead).filter(command => command.facts.output === undefined);

/** @returns the calls a probe made of one of the commands */
function callsOf(probing: Probing, commands: readonly Command[]) {
  const named = new Set(commands.map(command => command.words.join(' ')));
  return probing.calls.filter(called => called.command !== undefined && named.has(called.command));
}

/** A call the closed network refused shows nothing of a rule, so it breaks none. */
const reached = (probing: Probing, called: Called) => probing.unreached(called) === undefined;

/** @returns the number of calls in words, such as "1 call" or "7 calls" */
export const countOf = (count: number) => `${count} ${count === 1 ? 'call' : 'calls'}`;

export const quotedNames = (names: readonly string[]) =>
  names.map(name => JSON.stringify(name)).join(', ');

const withExample = (known: Known) =>
  known.commands.filter(command => command.example !== undefined);

const isEffect = (command: Command) => command.facts.options.some(o => o.option === '--dry-run');

const takesReplace = (command: Command) =>
  command.facts.options.some(o => o.option === '--replace');

const isList = (command: Command) => command.facts.options.some(o => o.option === '--page');

const isRead = (command: Command) => isEffect(command) === false && isList(command) === false;

/** A call with the example as its input; an effect runs for real, after its plan. */
const exampleCall = (command: Command, options: string[] = []) => ({
  argv: [...command.words, '--json', JSON.stringify(command.example), ...options],
  command: command.words.join(' '),
});

/** A call that must be refused, so an effect runs as a dry run and never writes. */
const inputCall = (command: Command, input: unknown) => ({
  argv: [
    ...command.words,
    '--json',
    JSON.stringify(input),
    ...(isEffect(command) ? ['--dry-run'] : []),
  ],
  command: command.words.join(' '),
});

const atField = (path: string | undefined, field: string) =>
  path === field || path?.startsWith(`${field}.`) === true;

const refused = (probing: Probing, called: Called) =>
  `${probing.line(called)} was refused: ${firstOf(answerIn(called.out).answer)}`;

const messages = (issues: readonly { code: string; message: string }[]) =>
  issues.map(issue => `${issue.code} ${issue.message}`).join('; ');
