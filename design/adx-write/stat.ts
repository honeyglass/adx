// When does a stat identity miss a change that a content hash sees?
// node stat.ts <folder>   (run it once on APFS and once on a FAT32 or exFAT volume)
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = process.argv[2]!;
const file = join(dir, 'index.md');
const sha = (p: string) =>
  createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
const id = (p: string) => {
  const s = fs.lstatSync(p, { bigint: true });
  return { dev: s.dev, ino: s.ino, size: s.size, mtimeNs: s.mtimeNs, ctimeNs: s.ctimeNs };
};
const same = (a: ReturnType<typeof id>, b: ReturnType<typeof id>, withCtime: boolean) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeNs === b.mtimeNs &&
  (!withCtime || a.ctimeNs === b.ctimeNs);
const inPlace = (data: string) => {
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_TRUNC); // an editor that saves in place
  fs.writeSync(fd, data);
  fs.closeSync(fd);
};
const report = (
  name: string,
  a: ReturnType<typeof id>,
  b: ReturnType<typeof id>,
  ha: string,
  hb: string,
) =>
  console.log(
    `${name}: (dev,ino,size,mtime) ${same(a, b, false) ? 'SAME' : 'differs'}; with ctime ${same(a, b, true) ? 'SAME' : 'differs'}; sha256 ${ha === hb ? 'SAME' : 'differs'}`,
  );

console.log(`folder ${dir}`);

// 1. A restored copy that keeps the old time: write in place, same size, then set mtime back (cp -p, rsync -t, touch -r).
fs.writeFileSync(file, '# index\n- a\n');
const ref = join(dir, 'ref');
execFileSync('touch', ['-r', file, ref]); // keep the old times, to the nanosecond
const a1 = id(file),
  h1 = sha(file);
inPlace('# index\n- z\n');
execFileSync('touch', ['-r', ref, file]); // what cp -p, rsync -t and a restore do: the old mtime comes back
const b1 = id(file),
  hb1 = sha(file);
console.log(`  mtime before ${a1.mtimeNs}, after restore ${b1.mtimeNs}`);
report('1 restored copy, same size, old mtime', a1, b1, h1, hb1);

// 2. Same size, written twice right after each other (no time reset): does the clock tick between them?
let equalMtime = 0,
  equalCtime = 0;
const n = 2000;
for (let i = 0; i < n; i++) {
  inPlace(`# index\n- ${i % 2 ? 'x' : 'y'}\n`);
  const a = id(file);
  inPlace(`# index\n- ${i % 2 ? 'y' : 'x'}\n`);
  const b = id(file);
  if (a.mtimeNs === b.mtimeNs) equalMtime++;
  if (a.ctimeNs === b.ctimeNs) equalCtime++;
}
console.log(
  `2 two same-size in-place writes back to back, ${n} pairs: mtime equal in ${equalMtime}, ctime equal in ${equalCtime}`,
);

// 3. The smallest step between file times this volume shows.
const times = new Set<bigint>();
for (let i = 0; i < 200; i++) {
  inPlace(`# index\n- ${i}\n`);
  times.add(id(file).mtimeNs);
}
const sorted = [...times].sort((x, y) => (x < y ? -1 : 1));
let step = 0n;
for (let i = 1; i < sorted.length; i++) {
  const d = sorted[i]! - sorted[i - 1]!;
  if (step === 0n || d < step) step = d;
}
console.log(
  `3 200 writes gave ${times.size} distinct mtimes; smallest step ${step} ns; sample ${sorted.slice(0, 3).join(', ')}`,
);

// 4. What else this volume supports: link(2) and a kernel lock.
fs.rmSync(join(dir, 'link-test'), { force: true });
try {
  fs.linkSync(file, join(dir, 'link-test'));
  console.log('4 link(2): supported');
  fs.unlinkSync(join(dir, 'link-test'));
} catch (e: any) {
  console.log(`4 link(2): ${e.code}`);
}
