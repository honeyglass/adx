/**
 * One call of the program, from Node's arguments to the exit code.
 *
 * main: what Tool.main() runs.
 *
 * Node enters here and nowhere else in '.': main() imports node/ when it runs, so code that only
 * builds a tool, or the test kit's run(), never loads a module of Node through '.'.
 *
 * @example if (import.meta.main) await hello.main();
 */
import { call } from './call.ts';
import type { Shell } from './tool.ts';

/** @param shell - what the call reads of the tool */
export async function main(shell: Shell) {
  const node = await import('../node/index.ts');
  node.write(await call(shell, node.around()));
}
