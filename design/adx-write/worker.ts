// One writer: runs `notes add indexed` many times. Each call writes a new note and appends one line
// to index.md. Modes:
//   naive       read, change, temporary file plus rename (docker); no check
//   check       the earlier design: identity (dev, ino, size, mtimeNs) recorded in plan,
//               compared with lstat before the first rename; no lock
//   lock-fn     the recommendation: root lock, files.update with a function recomputed under the lock
//   lock-value  root lock, files.update with a value checked against what plan read
import * as fs from 'node:fs';
import { join } from 'node:path';
import { Plan, commit, Refused } from './write.ts';

const [root, mode, id, iterations, gapMs, syncFlag] = process.argv.slice(2) as [string, string, string, string, string, string];
const n = Number(iterations);
const gap = Number(gapMs);
const sync = syncFlag === '1';
const LIMIT = 16 * 1024 * 1024;
const out = { ok: [] as string[], refused: {} as Record<string, number>, held: [] as number[], wait: [] as number[] };
const pause = (ms: number) => (ms > 0 ? new Promise(r => setTimeout(r, ms * Math.random() * 2)) : Promise.resolve());
const refuse = (code: string) => (out.refused[code] = (out.refused[code] ?? 0) + 1);

function tempWrite(path: string, data: string) {
  const temp = `${path}.${process.pid}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  fs.writeSync(fd, data);
  if (sync) fs.fsyncSync(fd);
  fs.closeSync(fd);
  return temp;
}

for (let i = 0; i < n; i++) {
  const line = `- w${id}-${i}`;
  const note = `notes/w${id}-${i}.md`;
  const index = join(root, 'index.md');
  if (mode === 'naive') {
    const old = fs.readFileSync(index, 'utf8');
    await pause(gap);
    fs.renameSync(tempWrite(join(root, note), `# ${line}\n`), join(root, note));
    fs.renameSync(tempWrite(index, old + line + '\n'), index);
    out.ok.push(line);
  } else if (mode === 'check') {
    const seen = fs.lstatSync(index, { bigint: true });
    const old = fs.readFileSync(index, 'utf8');
    await pause(gap);
    const tNote = tempWrite(join(root, note), `# ${line}\n`);
    const tIndex = tempWrite(index, old + line + '\n');
    const now = fs.lstatSync(index, { bigint: true });
    if (now.dev !== seen.dev || now.ino !== seen.ino || now.size !== seen.size || now.mtimeNs !== seen.mtimeNs) {
      fs.unlinkSync(tNote);
      fs.unlinkSync(tIndex);
      refuse('CHANGED_SINCE_PLAN');
      continue;
    }
    fs.linkSync(tNote, join(root, note));
    fs.unlinkSync(tNote);
    fs.renameSync(tIndex, index);
    out.ok.push(line);
  } else {
    const plan = new Plan(root);
    try {
      plan.write(note, `# ${line}\n`);
      if (mode === 'lock-fn') plan.update('index.md', LIMIT, old => old + line + '\n');
      else plan.updateValue('index.md', plan.read('index.md', LIMIT)! + line + '\n');
    } catch (e) {
      if (e instanceof Refused) {
        refuse(e.answer.issues[0]!.code);
        continue;
      }
      throw e;
    }
    await pause(gap);
    const answer = await commit(plan, { sync, lockWaitMs: 120_000 });
    if (answer.ok) {
      out.ok.push(line);
      out.held.push(answer.ms.held);
      out.wait.push(answer.ms.wait);
    } else refuse(answer.issues[0]!.code);
  }
}
process.stdout.write(JSON.stringify(out));
