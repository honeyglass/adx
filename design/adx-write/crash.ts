// SIGKILL a writer at three points of a two-file commit, then run the next call and show what it
// finds and cleans. Also: SIGTERM during a commit, with and without signal handlers.
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { show, fresh } from './show.ts';

const here = import.meta.dirname;
const base = join(here, 'runs', 'crash');

function startChild(root: string, line: string, stopAt: string, signals = 'default') {
  const child = spawn('node', [join(here, 'child.ts'), root, line, stopAt, signals], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', d => (out += d));
  const stopped = new Promise<void>(resolve =>
    child.stderr.on('data', d => {
      err += d;
      if (/STOPPED|SLEEPING/.test(err)) resolve();
    }),
  );
  const exited = new Promise<{ code: number | null; signal: string | null }>(r => child.on('exit', (code, signal) => r({ code, signal })));
  return { child, stopped, exited, out: () => out, err: () => err };
}

function lockIsFree(root: string) {
  const db = new DatabaseSync(join(root, '.adx.lock'), { timeout: 0 });
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('ROLLBACK');
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

for (const stopAt of ['before-rename-0', 'after-rename-0', 'after-rename-1']) {
  const root = fresh(base, stopAt);
  console.log(`\n===== SIGKILL at ${stopAt} (call adds "b": index.md first, then notes/b.md)`);
  const c = startChild(root, 'b', stopAt);
  await c.stopped;
  console.log(`lock free while the writer runs: ${lockIsFree(root)}`);
  show(root, 'folder while the writer is stopped');
  c.child.kill('SIGKILL');
  const exit = await c.exited;
  console.log(`writer ended by ${exit.signal}; lock free now: ${lockIsFree(root)}`);
  show(root, 'folder after the kill');
  const t0 = performance.now();
  const next = spawnSync('node', [join(here, 'child.ts'), root, 'c', 'none', 'default'], { encoding: 'utf8' });
  console.log(`next call ("c") answered in ${(performance.now() - t0).toFixed(0)} ms: ${next.stdout.trim()}`);
  show(root, 'folder after the next call');
}

for (const signals of ['handle', 'default']) {
  const root = fresh(base, `sigterm-${signals}`);
  console.log(`\n===== SIGTERM in the middle of a commit, signal handlers: ${signals}`);
  const c = startChild(root, 'b', 'sleep-after-rename-0', signals);
  await c.stopped;
  c.child.kill('SIGTERM');
  const exit = await c.exited;
  console.log(`writer exit: code ${exit.code} signal ${exit.signal}`);
  console.log(`writer stdout: ${c.out().trim() || '(nothing)'}`);
  console.log(`writer stderr: ${c.err().trim().split('\n').join(' | ')}`);
  show(root, 'folder after the writer ended');
  if (signals === 'default') {
    const next = spawnSync('node', [join(here, 'child.ts'), root, 'c', 'none', 'default'], { encoding: 'utf8' });
    console.log(`next call ("c"): ${next.stdout.trim()}`);
    show(root, 'folder after the next call');
  }
}
