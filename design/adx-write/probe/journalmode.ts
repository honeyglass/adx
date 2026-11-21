// Probe: which journal mode keeps SQLite from creating <lock>-journal while BEGIN IMMEDIATE holds the lock?
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, 'jm');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
for (const mode of ['DELETE', 'OFF', 'MEMORY']) {
  for (const locking of ['NORMAL', 'EXCLUSIVE']) {
    const path = join(dir, `${mode}-${locking}.lock`);
    fs.closeSync(fs.openSync(path, 'wx', 0o600));
    const db = new DatabaseSync(path, { timeout: 0 });
    const set = db.prepare(`PRAGMA journal_mode = ${mode}`).get();
    db.exec('BEGIN IMMEDIATE');
    const files = fs.readdirSync(dir).filter(n => n.startsWith(`${mode}-${locking}`));
    db.exec('ROLLBACK');
    db.close();
    console.log(`${mode}/${locking}: pragma answered ${JSON.stringify(set)}; during lock: ${files.join(', ')}; size ${fs.statSync(path).size}`);
    break;
  }
}
