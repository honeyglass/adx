/**
 * One call of a command answered as its tool answers it, for main() and for invoke.
 *
 * through: the answer of the handler with the steps after a success, or the refusal with the
 * command that helps each issue.
 *
 * A success gets the command's own `next`, then each `after` of the tool for it, in their order;
 * a dry run gets one step instead, the same call for real. An issue keeps the command it names,
 * else it gets the step of the tool's hint for its code, else, at a field with a source, the call
 * that lists the field's values. Each step is written out with the input of the call, so it
 * carries the call's global fields and the fields it carries.
 *
 * The $try here answers a refusal of adx only, which the schema, a list, `check`, a handler and
 * failed() throw or return, of any kind. Any other error is thrown again as it came, on the line
 * after the $try: a bug flies on to the one catch of the call, in main() or in invoke.
 *
 * @example placeAll(shell.commands, { name: shell.name, through: call => through(shell, call) });
 */
import { $try } from '@honeyglass/utils/ts';
import { followsOf, runnerOf } from '../command/index.ts';
import type { Answered, Run, Runner } from '../command/index.ts';
import { answerOfRefused, commandStep, Refused, refusedOf, stepOf } from '../core/index.ts';
import type { Issue, Step } from '../core/index.ts';
import { hintFor, stepAnswer } from '../steps/index.ts';
import type { Context } from '../steps/index.ts';
import { sources } from '../values/index.ts';
import type { Shell } from './tool.ts';

type Call = { runner: Runner; input: unknown; run: Run };

/**
 * @param shell - what the call reads of the tool
 * @param call - the command, the input as its caller gave it, and what the run is asked for
 * @returns the answer of the call
 * @throws any error that is no refusal of adx, as it came
 */
export async function through(shell: Shell, call: Call): Promise<Answered> {
  const context = { tool: shell.name, input: isRecord(call.input) ? call.input : {} };
  const { data, error } = await $try(() => succeeded(shell, call, context));
  if (error === null) return data;
  if (error instanceof Refused === false) throw error;
  const refused = refusedOf(error);
  return answerOfRefused(refused, await helped(shell, call.runner, refused.issues, context));
}

async function succeeded(shell: Shell, call: Call, context: Context): Promise<Answered> {
  const answered = await call.runner.answered(call.input, call.run);
  if (answered.ran === undefined) return answered;
  const steps =
    answered.answer.applied === false
      ? [commandStep(call.runner, context.input)]
      : stepsAfter(shell, call.runner, answered.ran);
  const next = await Promise.all(steps.map(step => stepAnswer(step, context)));
  if (next.length === 0) return answered;
  return { ...answered, answer: { ...answered.answer, next } };
}

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

// The command an issue names wins, then the tool's hint for its code, then the source of the
// field the issue stands at (decision 73).
function helped(shell: Shell, runner: Runner, issues: readonly Issue[], context: Context) {
  return Promise.all(
    issues.map(async issue => {
      const field = issue.path?.[0];
      const step: Step | undefined =
        stepOf(issue) ??
        hintFor(shell.hints, issue.code) ??
        (field === undefined ? undefined : sources.listStep(runner, field, context.input));
      if (step === undefined) return issue;
      const { does, command } = await stepAnswer(step, context);
      return issue.command(command === undefined ? { does } : { does, command });
    }),
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;
