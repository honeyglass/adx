/**
 * One call of a command answered as its tool answers it, for main() and for invoke.
 *
 * through: the answer of the handler with the steps after a success, or the refusal with the
 * command that helps each issue, all within the roots of the call.
 * invoked: the same for invoke, in scratch folders with the seed and the variables of a test.
 *
 * A success gets the steps a list derives, the following page and the command for one item,
 * then the command's own `next`, then each `after` of the tool for it, in their order; a dry run
 * gets one step instead, the same call for real. An issue keeps the command it names;
 * a SCHEMA issue gets the schema of the shape it lies in, or of the command; any other gets the
 * step of the tool's hint for its code, else, at a field with a source, the call that lists the
 * field's values, and at the cursor of a list, the first page. Each step is written out with the
 * input of the call, each path as adx shows it, so it carries the call's global fields, the
 * folders it moved and the fields it carries. A folder the call moved must be
 * there before anything runs (decision 13).
 *
 * The call runs on a line of the tool's remotes. While it answers a refusal, every remote is
 * blocked, so a source a carried field asks sends no request (decision 79). A real run of an
 * effect with `apply` checks the address and token of each remote before it writes a file, so
 * one that cannot send refuses with nothing written. After a file was written or a request sent,
 * the state of a refusal adds what the call left, to the state its refusal says: each file
 * written, and each request answered, refused or sent without an answer. Only after a send,
 * which may have taken effect, does an issue name the look of the command.
 *
 * The $try here answers a refusal of adx only, which the schema, a list, `check`, a handler and
 * failed() throw or return, of any kind. Any other error is thrown again as it came, on the line
 * after the $try: a bug flies on to the one catch of the call, in main() or in invoke.
 *
 * @example const answered = await through(shell, { runner, input, run }, around);
 */
import { $try, readRefusal, shown } from '@honeyglass/utils/ts';
import { followsOf, refused, runnerOf } from '../command/index.ts';
import type { Answered, Run, Runner, Scene } from '../command/index.ts';
import {
  answerOfRefused,
  commandStep,
  listing,
  lookOf,
  NOTHING_CHANGED,
  placeOf,
  Refused,
  refusedOf,
  refusing,
  stepOf,
  withCommand,
} from '../core/index.ts';
import type { Issue, Step, Surroundings, Writer } from '../core/index.ts';
import { Located, staging, within } from '../files/index.ts';
import { firstPage, listSteps } from '../list/index.ts';
import { Line } from '../remote/index.ts';
import { shapeNameAt } from '../shapes/index.ts';
import { hintFor, schema, stepAnswer } from '../steps/index.ts';
import type { Context } from '../steps/index.ts';
import { sources } from '../values/index.ts';
import { detailsOf } from './detail.ts';
import { inScratch } from './scene.ts';
import { knows } from './schema.ts';
import type { Shell } from './tool.ts';

type Call = { runner: Runner; input: unknown; run: Run };

/**
 * @param shell - what the call reads of the tool
 * @param call - the command, the input as its caller gave it, and what the run is asked for
 * @param around - the variables, folders and disk of the call
 * @returns the answer of the call
 * @throws any error that is no refusal of adx, as it came
 */
export async function through(shell: Shell, call: Call, around: Surroundings): Promise<Answered> {
  const roots = new Located(shell, around, call.run.folders);
  const [missing, ...more] = roots.issues();
  if (missing !== undefined) return refused([missing, ...more]);
  const line = new Line(shell, around);
  const work = () => line.run(() => answeredIn(shell, call, roots, line));
  return within(roots, () => listing(around.scope, shell, work));
}

/** @param call - the command, its input, its run, and the samples of the test that invokes it */
export function invoked(shell: Shell, call: Call & { scene: Scene }) {
  return inScratch(shell, call.scene, around => through(shell, call, around));
}

async function answeredIn(shell: Shell, call: Call, roots: Located, line: Line) {
  const input = call.runner.shown(isRecord(call.input) ? call.input : {});
  const context = { tool: shell.name, input, folders: roots.moved(), knowsSchema: knows(shell) };
  const staged = staging({
    replace: call.runner.spec.replace,
    replacing: call.run.replace,
    retry: () => commandStep(call.runner, input, [{ option: 'replace' }, { option: 'dry-run' }]),
  });
  const writer = call.runner.spec.apply === undefined ? staged : readied(staged, line);
  const { data, error } = await $try(() => succeeded(shell, call, context, writer));
  if (error === null) return data;
  if (error instanceof Refused === false) throw error;
  const refused = leftBy(refusedOf(error), [...writtenText(writer), ...line.state()]);
  const look = line.sent() ? lookOf(error) : undefined;
  const own = look === undefined ? refused.issues : refused.issues.map(i => withCommand(i, look));
  const issues = await refusing(() => helped(shell, call, own, context));
  return answerOfRefused(refused, issues);
}

// The writes of the plan, which check the remotes before the commit writes the first file.
function readied(writer: Writer, line: Line): Writer {
  return {
    paths: input => writer.paths(input),
    files: writer.files,
    get writes() {
      return writer.writes;
    },
    get staged() {
      return writer.staged;
    },
    commit: async () => {
      if (writer.staged > 0) line.ready();
      await writer.commit();
    },
    written: () => writer.written(),
  };
}

const writtenText = (writer: Writer) => {
  const files = writer.written();
  return files.length === 0 ? [] : [`Written: ${files.map(shown).join(', ')}.`];
};

// What the call left stands after the state the refusal says; "nothing was changed" goes.
function leftBy(refused: Refused, left: readonly string[]) {
  if (left.length === 0) return refused;
  const own = readRefusal(refused.message)?.state;
  const keep = own === undefined || own === NOTHING_CHANGED ? [] : [own];
  return refusedOf(refused, [...keep, ...left].join(' '));
}

// A dry run names the same call for real, with the --replace it was given.
async function succeeded(shell: Shell, call: Call, context: Context, writer: Writer) {
  const answered = await call.runner.answered(call.input, call.run, writer);
  if (answered.ran === undefined) return answered;
  const replacing = call.run.replace && call.runner.spec.replace === undefined;
  const steps =
    answered.answer.applied === false
      ? [commandStep(call.runner, context.input, replacing ? [{ option: 'replace' }] : [])]
      : [
          ...derived(shell, call, context, answered.answer.result),
          ...stepsAfter(shell, call.runner, answered.ran),
        ];
  const next = await Promise.all(steps.map(step => stepAnswer(step, context)));
  if (next.length === 0) return answered;
  return { ...answered, answer: { ...answered.answer, next } };
}

// The steps of a page read the page as the call answers it, so a key it cut names no detail.
function derived(shell: Shell, call: Call, context: Context, page: unknown) {
  if (call.runner.kind !== 'list') return [];
  const [detail] = detailsOf(shell, call.runner);
  return listSteps(page, listCall(call, context), detail);
}

// A page step carries the call as a step carries it, with the fields --fields named.
const listCall = (call: Call, context: Context) => ({
  target: call.runner,
  given: context.input,
  fields: call.run.fields,
  key: call.runner.spec.key,
});

function stepsAfter(shell: Shell, runner: Runner, ran: { result: unknown; input: unknown }) {
  const own = runner.spec.next?.(ran.result, ran.input) ?? [];
  const afters = shell.next.flatMap(after => {
    const follows = followsOf(after);
    if (follows === undefined) return [];
    const listed = follows.commands.some(command => runnerOf(command) === runner);
    return listed ? follows.next(ran.result, ran.input) : [];
  });
  return [...own, ...afters];
}

// The command an issue names wins, then the schema a SCHEMA issue lies in, then the tool's hint
// for its code, then the first page for the cursor of a list, then the source of the field the
// issue stands at (decisions 72, 73 and 78). A list has no field `page`: adx gives it the option.
function helped(shell: Shell, call: Call, issues: readonly Issue[], context: Context) {
  const { runner } = call;
  return Promise.all(
    issues.map(async issue => {
      const field = issue.path?.[0];
      const cursor = runner.kind === 'list' && field === 'page';
      const step: Step | undefined =
        stepOf(issue) ??
        schemaStepOf(shell, runner, issue) ??
        hintFor(shell.hints, issue.code) ??
        (cursor ? firstPage(listCall(call, context)) : undefined) ??
        (field === undefined ? undefined : sources.listStep(runner, field, context.input));
      if (step === undefined) return issue;
      const { does, command } = await stepAnswer(step, context);
      return issue.command(command === undefined ? { does } : { does, command });
    }),
  );
}

// A SCHEMA issue inside a shape of the tool shows that shape, any other the command that ran.
function schemaStepOf(shell: Shell, runner: Runner, issue: Issue) {
  const place = placeOf(issue);
  if (place === undefined) return undefined;
  const name = shapeNameAt(shell.shapes, place);
  return name === undefined ? runner.schemaStep() : schema.step(name);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;
