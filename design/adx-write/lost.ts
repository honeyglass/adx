// Runs N writers at once and counts lost index lines.
// node lost.ts <mode> <writers> <iterations> <gapMs> <sync 0|1>
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const [mode, writers, iterations, gapMs, sync] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
  string,
];
const here = import.meta.dirname;
const root = fs.mkdtempSync(join(process.env.RUNS ?? join(here, 'runs'), `${mode}-`));
fs.mkdirSync(join(root, 'notes'));
fs.writeFileSync(join(root, 'index.md'), '# index\n', { mode: 0o600 });

const start = performance.now();
const outs = await Promise.all(
  Array.from({ length: Number(writers) }, (_, id) =>
    run('node', [join(here, 'worker.ts'), root, mode, String(id), iterations, gapMs, sync], {
      maxBuffer: 64 << 20,
    }).then(r => JSON.parse(r.stdout)),
  ),
);
const seconds = (performance.now() - start) / 1000;

const acknowledged: string[] = outs.flatMap(o => o.ok);
const lines = fs
  .readFileSync(join(root, 'index.md'), 'utf8')
  .split('\n')
  .filter(l => l.startsWith('- '));
const inIndex = new Set(lines);
const lost = acknowledged.filter(l => !inIndex.has(l));
const refused: Record<string, number> = {};
for (const o of outs)
  for (const [k, v] of Object.entries(o.refused)) refused[k] = (refused[k] ?? 0) + (v as number);
const notes = fs.readdirSync(join(root, 'notes')).filter(n => n.endsWith('.md'));
const leftovers = fs
  .readdirSync(root, { recursive: true })
  .map(String)
  .filter(n => /\.(tmp|adx-tmp|adx-old)$|\.adx\.journal$/.test(n));
const held = outs.flatMap(o => o.held ?? []).sort((a, b) => a - b);
const wait = outs.flatMap(o => o.wait ?? []).sort((a, b) => a - b);
const q = (a: number[], p: number) =>
  a.length ? Number(a[Math.min(a.length - 1, Math.floor(a.length * p))]!.toFixed(2)) : null;

console.log(
  JSON.stringify({
    mode,
    writers: Number(writers),
    callsEach: Number(iterations),
    gapMs: Number(gapMs),
    sync: sync === '1',
    seconds: Number(seconds.toFixed(1)),
    acknowledged: acknowledged.length,
    indexLines: lines.length,
    lost: lost.length,
    duplicates: lines.length - inIndex.size,
    refused,
    notes: notes.length,
    leftovers: leftovers.length,
    heldMs: { p50: q(held, 0.5), p99: q(held, 0.99), max: q(held, 1) },
    waitMs: { p50: q(wait, 0.5), p99: q(wait, 0.99), max: q(wait, 1) },
  }),
);
