/**
 * One call of the program, from Node's arguments to the exit code.
 *
 * main: what Tool.main() runs.
 *
 * Node enters here and nowhere else in '.': main() imports node/ when it runs, so code that only
 * builds a tool, or the test kit's run(), never loads a module of Node through '.'.
 *
 * main() catches the errors that no call awaits, such as a timer that throws (decision 88), from
 * the moment node/ has loaded: nothing else runs between that and the catch. An error that
 * comes earlier, while the tool's files or node/ load, is not covered, and Node ends it with
 * exit 1.
 *
 * @example if (import.meta.main) await hello.main();
 */
import { trySync$ } from '@honeyglass/utils/ts';
import type { Around } from '../core/index.ts';
import type { Output } from '../node/index.ts';
import { call, lostAnswer } from './call.ts';
import type { Shell } from './tool.ts';

/** @param shell - what the call reads of the tool */
export async function main(shell: Shell) {
  const node = await import('../node/index.ts');
  const around = node.around();
  const out = node.output();
  node.catchLost(error => lost(out, shell, around, error));
  out.answer(await call(shell, around));
}

// A callback the runtime calls, so it catches once: an answer that breaks still ends with exit 2.
function lost(out: Output, shell: Shell, around: Around, error: unknown) {
  const { error: broke } = trySync$(() => out.bug(lostAnswer(shell, around, error)));
  if (broke !== null) out.stop();
}
