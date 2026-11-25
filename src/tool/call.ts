/**
 * One call of a tool: the arguments routed to `schema`, a command, the start answer, a group or
 * --version, and the answer in JSON or as text: the form --output forces, else text at a
 * terminal and JSON when piped.
 *
 * call: the exit code and what the call writes, for main() and for the test kit's run().
 * lostAnswer: what the program writes for an error that no call awaited, for main().
 *
 * The one $try of adx around a whole call stands here, since main() and run() share it. Below it,
 * nothing catches a bug, so a programming error reaches it and is answered as UNKNOWN_ERROR.
 *
 * @example const ran = await call(shell, { tokens: tokensOf(['greet']), tty: false, stdin });
 */
import { $try } from '@honeyglass/utils/ts';
import { formOf, listed, refused, route } from '../command/index.ts';
import type { Answered, Runner } from '../command/index.ts';
import {
  answerOfError,
  answerOfRefused,
  exitOf,
  listing,
  refusedWith,
  UNKNOWN_STATE,
  unknownError,
} from '../core/index.ts';
import type { Around, Issue, Ran, Surroundings, Token } from '../core/index.ts';
import { Located, within } from '../files/index.ts';
import { Line } from '../remote/index.ts';
import { namesSchema, schemaAnswer } from './schema.ts';
import { setupIssues } from './setup.ts';
import { started } from './start.ts';
import { textOf } from './text.ts';
import { through } from './through.ts';
import type { Shell } from './tool.ts';
import { namesVersion, versionAnswer } from './version.ts';

/**
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export async function call(shell: Shell, around: Around): Promise<Ran> {
  const read = formOf(around.tokens, shell.name);
  const tty = ttyOf(read, around);
  const answering = async () => written(await answered(shell, around, read), tty);
  const { data, error } = await $try(answering);
  if (error === null) return data;
  const { answer, err } = answerOfError(error);
  return { ...written({ answer }, tty), err };
}

/**
 * Such an error, a timer that throws or a promise nobody awaits, is a bug whatever it holds, so
 * it never keeps the kind of a RefusalError (decision 88).
 *
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @param error - what the process caught
 * @returns UNKNOWN_ERROR of kind bug, in the form the call answers in, and the error for stderr
 */
export function lostAnswer(shell: Shell, around: Around, error: unknown): Ran {
  const issue = unknownError.issue('the tool broke on an error that no call awaited');
  const { answer, err } = answerOfRefused(refusedWith([issue], UNKNOWN_STATE, error));
  return { ...written({ answer }, ttyOf(formOf(around.tokens, shell.name), around)), err };
}

// The form --output forces, else text at a terminal.
const ttyOf = (read: ReturnType<typeof formOf>, around: Around) =>
  'form' in read && read.form !== undefined ? read.form === 'text' : around.tty;

// The setup first, so a mistake in it shows on every call, then --output, then the words, then
// the command.
async function answered(
  shell: Shell,
  around: Around,
  read: ReturnType<typeof formOf>,
): Promise<Answered> {
  const [wrong, ...more] = setupIssues(shell, around.network);
  if (wrong !== undefined) return refused([wrong, ...more]);
  if ('answered' in read) return read.answered;
  if ('issues' in read) return refused(read.issues);
  const { tokens } = read;
  if (namesVersion(tokens)) return versionAnswer(shell);
  if (namesSchema(tokens)) return schemaAnswer(shell, tokens);
  const routed = route(shell.commands, tokens, shell.name);
  if (routed.found === 'command') return commandAnswered(shell, routed, around);
  if (routed.found === 'group' && routed.words.length === 0) return startedIn(shell, around);
  if (routed.found === 'group') return listed(routed.table, [shell.name, ...routed.words]);
  const [first, ...rest] = routed.issues;
  return refused([first, ...rest]);
}

// Help, --fields alone and a mistake in the arguments end the call before its handler.
async function commandAnswered(
  shell: Shell,
  routed: { runner: Runner; rest: readonly Token[]; before: readonly Issue[] },
  around: Around,
) {
  const read = await routed.runner.read(routed.rest, routed.before, around.stdin);
  return 'answer' in read ? read : through(shell, { runner: routed.runner, ...read }, around);
}

// The first steps carry a folder the variable moved, as every step does (decision 13). `start`
// may read a server, as any handler may.
async function startedIn(shell: Shell, around: Surroundings) {
  const roots = new Located(shell, around, {});
  const [missing, ...more] = roots.issues();
  if (missing !== undefined) return refused([missing, ...more]);
  const line = new Line(shell, around);
  const work = () => line.run(() => started(shell, roots.moved()));
  return within(roots, () => listing(around.scope, shell, work));
}

// Text at a terminal, else one JSON document, so a program that reads the answer parses it.
function written({ answer, text, err }: Answered, tty: boolean): Ran {
  const out = tty ? textOf(answer, text) : `${JSON.stringify(answer)}\n`;
  return { exit: exitOf(answer), out, err: err ?? '' };
}
