/**
 * The scratch folders of one call of the test kit, so a test never touches the person's data.
 *
 * scratch: a fresh home folder, a temp folder and, unless the test names one, a fresh working
 * directory; its remove() takes them away again, as a signal to adxcheck does.
 * seeded: a seed folder copied into a data folder.
 *
 * A relative path of a test, a seed or a working directory, is read from the folder the test
 * runs in.
 *
 * @example const made = scratch(undefined); seeded('test/seed', join(made.home, '.hello'));
 */
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { disk } from './disk.ts';
import { hold } from './held.ts';
import { network } from './network.ts';
import { scope } from './scope.ts';

/** @param cwd - the working directory the test names, kept after the call */
export function scratch(cwd: string | undefined) {
  const made = mkdtempSync(join(tmpdir(), 'adx-run-'));
  const home = join(made, 'home');
  mkdirSync(home);
  const tmp = join(made, 'tmp');
  mkdirSync(tmp);
  const work = cwd === undefined ? join(made, 'work') : resolve(cwd);
  if (cwd === undefined) mkdirSync(work);
  const remove = hold(() => rmSync(made, { recursive: true, force: true }));
  return { folder: made, home, tmp, cwd: work, disk, scope, network, remove };
}

/**
 * @param seed - the folder of files the tool should find
 * @param folder - the data folder of a root, which the copy makes
 */
export function seeded(seed: string, folder: string) {
  cpSync(resolve(seed), folder, { recursive: true });
}
