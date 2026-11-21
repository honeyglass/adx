// Probe: does node:sqlite give a kernel lock that the kernel drops when the holder dies?
import { DatabaseSync } from 'node:sqlite';
import { openSync, closeSync, constants as C } from 'node:fs';

const path = process.argv[2]!;
const hold = Number(process.argv[3] ?? 0);
try {
  closeSync(openSync(path, C.O_WRONLY | C.O_CREAT | C.O_EXCL, 0o600));
} catch (e: any) {
  if (e.code !== 'EEXIST') throw e;
}
const db = new DatabaseSync(path, { timeout: 0 });
const t0 = performance.now();
try {
  db.exec('BEGIN IMMEDIATE');
  console.log(`${process.pid} got lock after ${(performance.now() - t0).toFixed(2)} ms`);
  if (hold) {
    const end = Date.now() + hold;
    while (Date.now() < end) {}
  }
  db.exec('ROLLBACK');
} catch (e: any) {
  console.log(`${process.pid} refused: ${e.code} ${e.errcode} ${e.message}`);
}
