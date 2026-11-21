// Prototype of adx's write path: plan records what it saw, commit checks it under a kernel lock,
// writes temporary files, journals, moves them in, and rolls back on a failure.
// Only node: built-ins. Synchronous file calls, so a signal handler cannot run in the middle of a commit.
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

const C = fs.constants;
export const LOCK = '.adx.lock';
export const JOURNAL = '.adx.journal';
const TMP = '.adx-tmp';
const OLD = '.adx-old';
const READ_LIMIT = 16 * 1024 * 1024;

export type Kind = 'fix' | 'ask' | 'retry' | 'bug';
export type Issue = { code: string; path: string; message: string; hint: string };
export type Written = { file: string; bytes: number; replaces: boolean };
export type Answer =
  | { ok: true; written: Written[]; recovered?: string[]; ms: { wait: number; held: number } }
  | { ok: false; kind: Kind; state: string; issues: Issue[]; recovered?: string[] };

type Seen = { is: 'absent' } | { is: 'file'; size: number; sha: string; limit: number };
type Stage =
  | { rel: string; how: 'write'; data: Buffer }
  | { rel: string; how: 'update'; limit: number; change: (old: string) => string };

export type Options = {
  lockWaitMs?: number; // how long a commit waits for the root lock
  sync?: boolean; // fsync files, journal and folders (default true)
  rollback?: boolean; // put old files back when a later rename fails (default true)
  beforeRename?: (index: number, rel: string) => void; // test hook
  afterRename?: (index: number, rel: string) => void; // test hook
};

export class Refused extends Error {
  readonly answer: Extract<Answer, { ok: false }>;
  constructor(answer: Extract<Answer, { ok: false }>) {
    super(answer.issues[0]?.message);
    this.answer = answer;
  }
}

const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const isAdxName = (name: string) =>
  name === LOCK || name === JOURNAL || name.endsWith(TMP) || name.endsWith(OLD);

/** One bounded read: open without following a link, take kind and size from the opened file, stop at the limit. */
export function readBounded(path: string, limit: number): Buffer | undefined {
  let fd: number;
  try {
    fd = fs.openSync(path, C.O_RDONLY | C.O_NOFOLLOW | C.O_NONBLOCK);
  } catch (e: any) {
    if (e.code === 'ENOENT') return undefined;
    throw e;
  }
  try {
    if (!fs.fstatSync(fd).isFile())
      throw Object.assign(new Error(`${path} is not a file`), { code: 'NOT_A_FILE' });
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.allocUnsafe(Math.min(65536, limit + 1 - total));
      const n = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (n === 0) break;
      chunks.push(chunk.subarray(0, n));
      total += n;
      if (total > limit)
        throw Object.assign(new Error(`${path} is larger than ${limit} bytes`), {
          code: 'TOO_LARGE',
        });
    }
    return Buffer.concat(chunks, total);
  } finally {
    fs.closeSync(fd);
  }
}

function listNames(folder: string): string[] {
  try {
    return fs
      .readdirSync(folder)
      .filter(n => !isAdxName(n))
      .sort();
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

/** What `plan` sees and stages. A dry run stops after plan; nothing here writes. */
export class Plan {
  readonly seen = new Map<string, Seen>();
  readonly listings = new Map<string, string[]>();
  readonly staged: Stage[] = [];
  readonly root: string;
  constructor(root: string) {
    this.root = root;
  }

  abs(rel: string) {
    return join(this.root, rel);
  }

  private readonly texts = new Map<string, string | undefined>();

  /** A read through a handle: recorded, so the commit can check it is still the same. One plan reads a file once. */
  read(rel: string, limit: number): string | undefined {
    if (this.texts.has(rel)) return this.texts.get(rel);
    const data = readBounded(this.abs(rel), limit);
    this.seen.set(
      rel,
      data ? { is: 'file', size: data.length, sha: sha(data), limit } : { is: 'absent' },
    );
    this.texts.set(rel, data?.toString('utf8'));
    return data?.toString('utf8');
  }

  /** A listing is a read too: a name that appears or goes away changes the plan. */
  list(folder: string): string[] {
    const names = listNames(this.abs(folder));
    this.listings.set(folder, names);
    return names;
  }

  /** files.write: a new file, or with replace the whole file; adx reads the old one for `changes`. */
  write(rel: string, data: string | Buffer, opts: { replace?: boolean } = {}): Written {
    const old = this.read(rel, READ_LIMIT);
    if (old !== undefined && !opts.replace)
      throw new Refused(
        refusal(
          'fix',
          'Nothing was changed.',
          'ALREADY_EXISTS',
          rel,
          `${rel} exists`,
          `add --replace to overwrite ${rel}`,
        ),
      );
    const bytes = Buffer.from(data);
    this.staged.push({ rel, how: 'write', data: bytes });
    return { file: rel, bytes: bytes.length, replaces: old !== undefined };
  }

  /** files.update with a function: run now for the plan's answer, and again under the lock at commit. */
  update(rel: string, limit: number, change: (old: string) => string): Written {
    const old = readBounded(this.abs(rel), limit); // not recorded: the commit re-reads it under the lock
    if (old === undefined)
      throw new Refused(
        refusal(
          'fix',
          'Nothing was changed.',
          'NOT_FOUND',
          rel,
          `${rel} does not exist`,
          'files.update never creates a file',
        ),
      );
    const next = change(old.toString('utf8'));
    this.staged.push({ rel, how: 'update', limit, change });
    return { file: rel, bytes: Buffer.byteLength(next), replaces: true };
  }

  /** files.update with a value: checked against what the plan read, refused when it changed. */
  updateValue(rel: string, data: string | Buffer): Written {
    const old = this.read(rel, READ_LIMIT);
    if (old === undefined)
      throw new Refused(
        refusal(
          'fix',
          'Nothing was changed.',
          'NOT_FOUND',
          rel,
          `${rel} does not exist`,
          'files.update never creates a file',
        ),
      );
    const bytes = Buffer.from(data);
    this.staged.push({ rel, how: 'write', data: bytes });
    return { file: rel, bytes: bytes.length, replaces: true };
  }
}

export function refusal(
  kind: Kind,
  state: string,
  code: string,
  path: string,
  message: string,
  hint: string,
) {
  return { ok: false as const, kind, state, issues: [{ code, path, message, hint }] };
}

// ---------- the root lock ----------

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * The root lock: SQLite asks the kernel for a write lock on one byte of <root>/.adx.lock
 * (fcntl F_SETLK on Unix, LockFileEx on Windows). The kernel drops it when the process ends,
 * however it ends. The wait is a loop of try-locks with async sleeps, so SIGINT can still end a wait.
 */
export async function withRootLock<T>(
  root: string,
  waitMs: number,
  fn: () => T,
): Promise<{ held: T; wait: number; ms: number } | undefined> {
  const path = join(root, LOCK);
  try {
    fs.closeSync(fs.openSync(path, C.O_WRONLY | C.O_CREAT | C.O_EXCL | C.O_NOFOLLOW, 0o600));
  } catch (e: any) {
    if (e.code !== 'EEXIST') throw e;
  }
  const db = new DatabaseSync(path, { timeout: 0 });
  // The lock file is never written, so its journal can stay in memory: no -journal file beside it.
  // (OFF is refused by Node's SQLite and silently stays DELETE.)
  db.exec('PRAGMA journal_mode = MEMORY');
  const start = performance.now();
  try {
    for (;;) {
      try {
        db.exec('BEGIN IMMEDIATE');
        break;
      } catch (e: any) {
        if (e.errcode !== 5 /* SQLITE_BUSY */) throw e;
        if (performance.now() - start > waitMs) return undefined;
        await sleep(2 + Math.random() * 4); // a flat, jittered poll: an old waiter keeps the same chance as a new one
      }
    }
    const got = performance.now();
    try {
      const held = fn();
      return { held, wait: got - start, ms: performance.now() - got };
    } finally {
      db.exec('ROLLBACK');
    }
  } finally {
    db.close();
  }
}

// ---------- the commit ----------

type Entry = {
  rel: string;
  target: string;
  temp: string;
  backup: string;
  replaces: boolean;
  data: Buffer;
  mode: number;
  ino?: number;
};

function syncDir(dir: string, sync: boolean) {
  if (!sync || process.platform === 'win32') return;
  const fd = fs.openSync(dir, 'r');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function sideName(target: string, token: string, suffix: string) {
  let base = basename(target);
  // A name may be at most 255 bytes; shorten the copied part so the side name fits.
  while (Buffer.byteLength(`.${base}.${token}${suffix}`) > 255) base = base.slice(0, -1);
  return join(dirname(target), `.${base}.${token}${suffix}`);
}

function changedFiles(plan: Plan): string[] {
  const changed: string[] = [];
  for (const [rel, seen] of plan.seen) {
    const path = plan.abs(rel);
    if (seen.is === 'absent') {
      if (fs.existsSync(path) || isLink(path)) changed.push(rel);
      continue;
    }
    let st: fs.Stats;
    try {
      st = fs.lstatSync(path);
    } catch {
      changed.push(rel);
      continue;
    }
    if (!st.isFile() || st.size !== seen.size) {
      changed.push(rel); // a different size needs no read
      continue;
    }
    const now = readBounded(path, seen.limit);
    if (!now || sha(now) !== seen.sha) changed.push(rel);
  }
  for (const [folder, names] of plan.listings)
    if (listNames(plan.abs(folder)).join('\0') !== names.join('\0')) changed.push(folder + '/');
  return changed;
}

function isLink(path: string) {
  try {
    return fs.lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Removes or reverses the leftovers a journal names. Runs under the lock, before a commit. */
export function recover(root: string, sync = true): string[] {
  const path = join(root, JOURNAL);
  let text: string;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  const lines = text
    .split('\n')
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line)];
      } catch {
        return []; // a torn last line after a power cut
      }
    });
  type Logged = { rel: string; temp: string; backup: string; replaces: boolean };
  const header = lines[0] as { token: string; entries: Logged[] } | undefined;
  const mark = lines[1] as { commit: number[] } | undefined;
  const done: string[] = [];
  const unlinkQuiet = (p: string) => {
    try {
      fs.unlinkSync(p);
      return true;
    } catch (e: any) {
      if (e.code === 'ENOENT') return false;
      throw e;
    }
  };
  if (header) {
    // Paths are relative to the root, so a moved root still recovers.
    for (const e of header.entries as (Logged & { target: string })[]) {
      e.target = join(root, e.rel);
      e.temp = join(root, e.temp);
      e.backup = join(root, e.backup);
    }
    const ours = header.entries.map((e, i) => {
      try {
        return mark !== undefined && fs.lstatSync(e.target).ino === mark.commit[i];
      } catch {
        return false;
      }
    });
    const complete = mark !== undefined && ours.every(Boolean);
    (header.entries as (Logged & { target: string })[]).forEach((e, i) => {
      if (ours[i] && !complete) {
        if (e.replaces) {
          fs.renameSync(e.backup, e.target);
          done.push(`put back ${e.rel}`);
        } else {
          unlinkQuiet(e.target);
          done.push(`removed ${e.rel}`);
        }
      }
      if (unlinkQuiet(e.temp)) done.push(`removed ${basename(e.temp)}`);
      if (unlinkQuiet(e.backup)) done.push(`removed ${basename(e.backup)}`);
    });
    if (complete) done.unshift('kept a finished commit');
    for (const dir of new Set(
      (header.entries as (Logged & { target: string })[]).map(e => dirname(e.target)),
    ))
      syncDir(dir, sync);
  }
  fs.unlinkSync(path);
  syncDir(root, sync);
  return done;
}

export async function commit(plan: Plan, options: Options = {}): Promise<Answer> {
  const sync = options.sync ?? true;
  const rollback = options.rollback ?? true;
  fs.mkdirSync(plan.root, { recursive: true, mode: 0o700 });
  for (const s of plan.staged)
    fs.mkdirSync(dirname(plan.abs(s.rel)), { recursive: true, mode: 0o700 });
  let recovered: string[] = [];
  const locked = await withRootLock(plan.root, options.lockWaitMs ?? 10_000, () => {
    recovered = recover(plan.root, sync);
    return commitLocked(plan, sync, rollback, options);
  });
  if (!locked)
    return refusal(
      'retry',
      'Nothing was changed.',
      'LOCKED',
      LOCK,
      `another call held the lock of ${plan.root} for longer than ${options.lockWaitMs ?? 10_000} ms`,
      'call again in a few seconds',
    );
  const answer = locked.held;
  if (recovered.length) answer.recovered = recovered;
  if (answer.ok) answer.ms = { wait: locked.wait, held: locked.ms };
  return answer;
}

function commitLocked(plan: Plan, sync: boolean, rollback: boolean, options: Options): Answer {
  // 1. Everything the plan saw must still be the same.
  const changed = changedFiles(plan);
  if (changed.length)
    return {
      ok: false,
      kind: 'retry',
      state: 'Nothing was changed.',
      issues: changed.map(rel => ({
        code: 'CHANGED_SINCE_PLAN',
        path: rel,
        message: `${rel} changed after this call read it`,
        hint: 'call again; the plan reads the new content',
      })),
    };

  // 2. The content of every file, a function update recomputed from what is there now.
  const token = randomBytes(6).toString('hex');
  const entries: Entry[] = [];
  for (const s of plan.staged) {
    const target = plan.abs(s.rel);
    let data: Buffer;
    if (s.how === 'update') {
      const old = readBounded(target, s.limit);
      if (old === undefined)
        return refusal(
          'retry',
          'Nothing was changed.',
          'CHANGED_SINCE_PLAN',
          s.rel,
          `${s.rel} was removed after the plan`,
          'call again',
        );
      data = Buffer.from(s.change(old.toString('utf8')));
    } else data = s.data;
    let mode = 0o600;
    let replaces = false;
    try {
      const st = fs.lstatSync(target);
      replaces = true;
      if (st.isFile()) mode = st.mode & 0o7777; // a replaced file keeps its mode
    } catch {}
    entries.push({
      rel: s.rel,
      target,
      temp: sideName(target, token, TMP),
      backup: sideName(target, token, OLD),
      replaces,
      data,
      mode,
    });
  }

  // 3. The journal names every side file before the first one exists.
  const journalPath = join(plan.root, JOURNAL);
  const jfd = fs.openSync(journalPath, C.O_WRONLY | C.O_CREAT | C.O_EXCL, 0o600);
  const journal = (record: unknown) => {
    fs.writeSync(jfd, JSON.stringify(record) + '\n');
    if (sync) fs.fsyncSync(jfd);
  };
  try {
    const rel = (p: string) => p.slice(plan.root.length + 1);
    journal({
      token,
      pid: process.pid,
      entries: entries.map(e => ({
        rel: e.rel,
        temp: rel(e.temp),
        backup: rel(e.backup),
        replaces: e.replaces,
      })),
    });
    syncDir(plan.root, sync);

    // 4. Every file whole beside its place: O_EXCL never follows a link left at the temporary name.
    for (const e of entries) {
      const fd = fs.openSync(e.temp, C.O_WRONLY | C.O_CREAT | C.O_EXCL, 0o600);
      try {
        if (e.mode !== 0o600) fs.fchmodSync(fd, e.mode);
        let off = 0;
        while (off < e.data.length) off += fs.writeSync(fd, e.data, off, e.data.length - off);
        if (sync) fs.fsyncSync(fd);
        e.ino = fs.fstatSync(fd).ino;
      } finally {
        fs.closeSync(fd);
      }
    }

    // 5. The commit mark: from here on, recovery compares inodes to see which files moved in.
    journal({ commit: entries.map(e => e.ino) });
  } catch (error) {
    fs.closeSync(jfd);
    for (const e of entries) fs.rmSync(e.temp, { force: true });
    fs.unlinkSync(journalPath);
    return systemRefusal(error, 'Nothing was changed.');
  }
  fs.closeSync(jfd);

  // 6. Move in: a replaced file keeps a second name (hard link) until the end; a new file is linked, never renamed over.
  for (const [i, e] of entries.entries()) {
    try {
      options.beforeRename?.(i, e.rel);
      if (e.replaces) {
        keepOld(e, sync);
        fs.renameSync(e.temp, e.target);
      } else moveNew(e);
      options.afterRename?.(i, e.rel);
    } catch (error: any) {
      return undo(plan, entries, i, error, rollback, sync);
    }
  }

  // 7. Make the renames durable, then drop the backups and the journal.
  for (const dir of new Set(entries.map(e => dirname(e.target)))) syncDir(dir, sync);
  for (const e of entries) fs.rmSync(e.backup, { force: true });
  fs.unlinkSync(journalPath);
  syncDir(plan.root, sync);
  return {
    ok: true,
    written: entries.map(e => ({ file: e.rel, bytes: e.data.length, replaces: e.replaces })),
    ms: { wait: 0, held: 0 },
  };
}

/** The old file keeps a second name: a hard link (no copy), or on a volume without links a copy of its bytes. */
function keepOld(e: Entry, sync: boolean) {
  try {
    fs.linkSync(e.target, e.backup);
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.code === 'EEXIST') throw error;
    const old = readBounded(e.target, Number.MAX_SAFE_INTEGER);
    if (!old) throw error;
    const fd = fs.openSync(e.backup, C.O_WRONLY | C.O_CREAT | C.O_EXCL, e.mode);
    try {
      fs.writeSync(fd, old);
      if (sync) fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }
}

/** A new file: link(2) fails with EEXIST if a file appeared, so it never replaces one. Without links: check, then rename. */
function moveNew(e: Entry) {
  try {
    fs.linkSync(e.temp, e.target);
    fs.unlinkSync(e.temp);
  } catch (error: any) {
    if (error.code === 'EEXIST' || error.code === 'ENOENT') throw error;
    if (fs.existsSync(e.target) || isLink(e.target))
      throw Object.assign(new Error('exists'), { code: 'EEXIST' });
    fs.renameSync(e.temp, e.target); // under the lock only a writer outside adx can come between
  }
}

function undo(
  plan: Plan,
  entries: Entry[],
  failed: number,
  error: any,
  rollback: boolean,
  sync: boolean,
): Answer {
  const conflict = error.code === 'EEXIST' && !entries[failed]!.replaces;
  const cause = conflict
    ? `${entries[failed]!.rel} appeared after the plan`
    : `moving ${entries[failed]!.rel} failed: ${error.code}`;
  const moved = entries.slice(0, failed);
  const left: string[] = []; // files not put back
  const side: string[] = []; // temporary files and backups not removed
  const tryDo = (what: string, f: () => void, into = left) => {
    try {
      f();
    } catch (e: any) {
      if (e.code !== 'ENOENT') into.push(`${what} (${e.code})`);
    }
  };
  const keep = new Set<Entry>(); // backups still needed by the next recovery
  if (rollback) {
    for (const e of [...moved].reverse()) {
      const before = left.length;
      if (e.replaces) tryDo(`put back ${e.rel}`, () => fs.renameSync(e.backup, e.target));
      else
        tryDo(
          `remove ${e.rel}`,
          () => fs.lstatSync(e.target).ino === e.ino && fs.unlinkSync(e.target),
        );
      if (left.length > before) keep.add(e);
    }
  }
  for (const e of entries) {
    tryDo(e.temp.slice(plan.root.length + 1), () => fs.unlinkSync(e.temp), side);
    if (!keep.has(e))
      tryDo(e.backup.slice(plan.root.length + 1), () => fs.unlinkSync(e.backup), side);
  }
  for (const dir of new Set(entries.map(e => dirname(e.target))))
    tryDo(`sync ${dir}`, () => syncDir(dir, sync), side);
  const names = moved.map(e => e.rel).join(', ');
  let state: string;
  if (!rollback)
    state = moved.length ? `Written before the failure: ${names}.` : 'Nothing was changed.';
  else if (left.length === 0)
    state = moved.length
      ? `Nothing was changed: ${cause}, and ${names} was put back.`
      : `Nothing was changed: ${cause}.`;
  else
    state = `Not all was undone: ${cause}; could not ${left.join(', ')}. The next write of this tool puts it back.`;
  if (side.length)
    state += ` A temporary file could not be removed (${side.join(', ')}); ${rollback ? 'the next write removes it' : 'nothing removes it later'}.`;
  if ((left.length === 0 && side.length === 0) || !rollback)
    fs.rmSync(join(plan.root, JOURNAL), { force: true });
  if (conflict)
    return refusal(
      'retry',
      state,
      'CHANGED_SINCE_PLAN',
      entries[failed]!.rel,
      cause,
      'call again; the plan reads the new content',
    );
  return systemRefusal(error, state, entries[failed]!.rel);
}

function systemRefusal(error: any, state: string, path = '') {
  const retry = ['EBUSY', 'EAGAIN'].includes(error.code);
  return refusal(
    retry ? 'retry' : 'ask',
    state,
    'SYSTEM_REFUSED',
    path,
    `the system refused: ${error.code ?? error.message}`,
    retry ? 'call again' : 'check the folder and its permissions',
  );
}
