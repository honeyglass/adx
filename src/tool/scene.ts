/**
 * The surroundings of a call in the process of a test, so a test never touches the person's data.
 *
 * inScratch: runs the work in a fresh home folder with the seed copied into each data folder,
 * in the working directory the test names or a fresh one, with the variables the test names.
 * Every root the test does not name lies in the scratch folder, also one at an absolute place.
 *
 * The scratch folders are removed on every path, also when the work fails. Node enters through
 * an import when a test runs, as main() imports it, so code that only builds a tool loads none.
 *
 * @example const ran = await inScratch(shell, { seed: 'seed' }, around => call(shell, around));
 */
import { $try } from '@honeyglass/utils/ts';
import type { Scene } from '../command/index.ts';
import type { Surroundings } from '../core/index.ts';
import { seedFolders } from '../files/index.ts';
import type { Shell } from './tool.ts';

/**
 * @param shell - what the call reads of the tool
 * @param scene - the variables, the seed and the working directory the test names
 * @param work - the call in these surroundings
 * @returns what the work answers; its error is thrown again once the folders are removed
 */
export async function inScratch<T>(
  shell: Shell,
  scene: Scene & { cwd?: string },
  work: (around: Surroundings) => Promise<T>,
): Promise<T> {
  const node = await import('../node/index.ts');
  const made = node.scratch(scene.cwd);
  const { home, cwd, disk, scope } = made;
  const around = { env: scene.env ?? {}, home, cwd, disk, scope, confined: made.folder };
  const { data, error } = await $try(async () => {
    const seed = scene.seed;
    if (seed !== undefined) seedFolders(shell, around).forEach(folder => node.seeded(seed, folder));
    return work(around);
  });
  made.remove();
  if (error !== null) throw error;
  return data;
}
