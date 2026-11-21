# Several writers at once: how adx writes files

Design, 2026-11-20. It builds on `decisions.md` (10, 12, 13, 16 to 19), `datadir-research.md`, the rule that `plan`
stages files, and design.md's "Writes and paths" with rules 5, 9 and 11. It replaces the earlier
design of an identity check without a lock, and answers the open question of a lock (decision 20
defers it). Nothing here is built into adx. A prototype of the write path and its
experiments live in `adx-write/` beside this file (see "Experiments").

## Summary of the recommendation

1. **A short lock per root, held by the kernel.** adx locks a root only while it checks and moves
   files in, never while `plan` or `apply` runs. The lock lives on `<root>/.adx.lock` and is taken
   through Node's built-in `node:sqlite`. The kernel drops it when the process dies, so no lock is
   ever left behind; in the experiment the next call got it at once after a `SIGKILL`.
2. **Under the lock, adx checks what the plan saw.** Every file the plan read, listed or will
   replace must still hold the same bytes (a SHA-256 hash, not the file's times). A difference
   refuses the call: `CHANGED_SINCE_PLAN`, kind `retry`, nothing written.
3. **`files.update` takes a function, and adx runs it again under the lock.** An index or a counter
   is re-read and recomputed there, so parallel `notes add` calls neither lose a line nor refuse
   each other. 20 processes doing 100 calls each lost 0 of 2000 lines, against 1702 with plain writes
   and 625 of 954 with the earlier identity check without a lock.
4. **A new file moves in with `link`,** so it never replaces a file that appeared meanwhile.
5. **Several files are all or nothing, also when a move fails or the process dies.** A journal is
   written first, and each replaced file keeps a second name until the end; a failed move puts the
   old files back, and the next write undoes a commit a killed process left halfway.
6. **Each file is synced to disk before its move, the folders after,** so an `ok` answer survives a
   power cut (by design; no power was cut here). On this Mac that costs about 31 ms per two-file
   commit.

The author's one choice: `files.update(file, limit, change)` recomputes, `files.update(file, data)`
is checked and may refuse. There is no switch for the lock.

## Terms used below

- **System call:** a request a program makes to the kernel, such as `open` or `rename`. Node's
  `fs.openSync` and friends call them almost one to one.
- **File descriptor:** the number the kernel gives a process for a file it opened.
- **Inode:** the kernel's record of one file: its bytes, size, mode and times. A name in a folder
  points to an inode; `ino` is its number. Two names can point to the same inode.
- **Hard link:** a second name for an existing inode. `link(a, b)` creates the name `b`; it fails
  with `EEXIST` if `b` exists. Removing one name (`unlink`) leaves the other.
- **`rename(a, b)`:** moves a name. If `b` exists, it is replaced in one step: a program that opens
  `b` gets the old file or the new one, never a mix and never nothing. This holds per name, not for
  several names at once.
- **`O_CREAT | O_EXCL`:** flags of `open` that create the file and fail with `EEXIST` if the name
  exists, also when the name is a symbolic link, so the open never follows a link.
- **Page cache:** the kernel's copy of file data in memory. A write lands there first. It survives a
  crash of the process, not a power cut.
- **`fsync`:** asks the kernel to write a file's data from the page cache to the disk and waits. On a
  folder it makes the names in it durable (a create, a rename, an unlink). On macOS, Node's `fsync`
  calls `fcntl(F_FULLFSYNC)`, which also empties the drive's own cache.
- **Advisory lock:** a lock the kernel keeps for a process on a range of bytes of a file
  (`fcntl(F_SETLK)` on Unix, `LockFileEx` on Windows). It only stops programs that ask for the same
  lock; it never stops a plain write. The kernel drops it when the process ends, however it ends.
- **`SIGKILL`:** a signal that ends a process at once. The process cannot catch it, so no cleanup
  code runs. `SIGINT` (Ctrl-C) and `SIGTERM` (a polite stop) can be caught.
- **`mtime`, `ctime`:** the time a file's bytes last changed, and the time its inode last changed.
  Any program may set `mtime` back (`touch -r`, `cp -p`); none can set `ctime`.

## The mechanism, case by case

### The steps every write goes through

**Plan** (no lock, nothing written; a dry run ends here):

1. A read through a handle (`file.text(limit)`, `file.json(...)`) opens the file with
   `fs.openSync(path, O_RDONLY | O_NOFOLLOW | O_NONBLOCK)`, takes kind and size from `fstat`, reads
   to one byte past the limit and closes it (rule 4, unchanged). adx keeps the SHA-256 of the bytes,
   or "absent" for a missing file. One plan reads a file once; a second read answers the same text.
2. `root.list(folder)` calls `readdir`; adx keeps the sorted names.
3. `files.write(file, data)` reads the old file the same way (adx needs it for `replaces` and
   `changes`, decision 19). An existing file without `--replace` is `ALREADY_EXISTS` (decision 10).
4. `files.update(file, limit, change)` reads the file, runs `change` for the plan's answer, and does
   **not** keep the read: the commit reads it again. A missing file is refused (decision 12).
5. `apply` runs, if the effect has one. Before a send, adx runs the check of step 9 once without the
   lock, so a call that will be refused does not send first.

**Commit** (all file calls synchronous, see "Signals"):

6. **Root.** `fs.mkdirSync(root, { recursive: true, mode: 0o700 })` if the root is missing
   (decision 17); the lock file lives in it.
7. **Lock.** `fs.openSync('<root>/.adx.lock', O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o600)`
   creates the empty lock file if it is missing (`EEXIST` is fine). Then `new DatabaseSync(path,
   { timeout: 0 })`, `PRAGMA journal_mode = MEMORY` and `BEGIN IMMEDIATE`. SQLite never writes to
   the file. Without the pragma it still creates a 512-byte `.adx.lock-journal` while the lock is
   held, and `OFF` is silently refused by Node's SQLite (both seen in the prototype). Under the hood
   SQLite calls `fcntl(fd, F_SETLK, ...)` twice: a read lock on a range of bytes it keeps for
   readers, then a write lock on one byte it keeps for the one writer. While another process holds
   that byte the call fails at once; adx sleeps 2 to 6 ms and tries again, for up to 10 s, then
   answers `LOCKED`. The sleep is flat on purpose: with a growing back-off the
   oldest waiter sleeps longest and loses to newcomers (worst wait 20.7 s in the experiment); with a
   flat one every waiter has the same chance (worst wait 4.7 s, same load).
8. **Recovery.** If `<root>/.adx.journal` exists, an earlier call died during its commit; adx
   finishes or undoes it now (see "Crashes and leftovers").
9. **Check.** For every file the plan recorded: "absent" must still be absent (`lstat` answers
   `ENOENT`); a read file must have the same size (`lstat`) and, if so, the same SHA-256 after a new
   bounded read; a listing must have the same names (`readdir`). Any difference: release the lock,
   answer `CHANGED_SINCE_PLAN`.
10. **Content.** For `files.update` with a function, adx reads the file now and runs `change` on it.
11. **Journal.** `fs.openSync('<root>/.adx.journal', O_WRONLY | O_CREAT | O_EXCL, 0o600)`, one JSON
    line with a random token, the pid, the folders the commit will create, and for each file its
    name, its temporary name, its backup name and whether it is new; `fsync` of the journal and of
    the root folder. Every name the commit will create is now on disk before it exists.
12. **Temporary files.** First `fs.mkdirSync(dir, { mode: 0o700 })` for each missing target
    folder, from the top down. Then for each file, in the target's own folder (a rename only works
    within one file system): `fs.openSync('.<name>.<token>.adx-tmp', O_WRONLY | O_CREAT | O_EXCL, 0o600)`;
    `fchmod` to the old mode for a replaced file (decision 17: a replaced file keeps its mode);
    `write` until every byte is out; `fsync`; `fstat` for the inode number; `close`. A name over
    255 bytes is shortened in the copied part.
13. **Commit mark.** Append `{"commit":[ino, ...]}` (the temporary files' inode numbers) to the
    journal and `fsync` it. From here on, recovery can tell which files moved in.
14. **Move in,** in the order the plan staged them:
    - a replaced file: `link(target, '.<name>.<token>.adx-old')` (the backup: a second name for the
      old inode, no copy), then `rename(temp, target)`;
    - a new file: `link(temp, target)`, then `unlink(temp)`. `link` fails with `EEXIST` if a file
      appeared since the check, so a new file never replaces one.

    A failure here undoes the moves before it (see "Several files").
15. **Durable.** `fsync` of every target folder.
16. **Clean.** `unlink` every backup, `unlink` the journal, `fsync` the root folder.
17. **Unlock.** `ROLLBACK` releases the byte lock; `close`.

### A new file (`files.write`)

The plan records "absent" (step 3). The check (9) refuses if the file exists now. `link` (14)
refuses if it appeared in the microseconds after the check. Either way the answer is
`CHANGED_SINCE_PLAN`, not `ALREADY_EXISTS`: the plan did not see the file, and a retry plans again,
which then answers `ALREADY_EXISTS` with its `--replace` hint, or takes another branch (see "The API
change").

### A replaced file (`files.write --replace`)

The plan reads the old bytes and computes `changes` from them (decision 19). The check (9) demands
the same bytes, so the `changes` in the answer are exactly what was replaced; another writer's
change in between is never dropped silently. The new file keeps the old mode (12). The old inode
keeps the backup name until step 16.

### An updated file (`files.update`)

With a function, nothing is checked for that file: under the lock adx reads what is there now and
runs `change` again (10). Two calls that each append a line both land, in the order they took the
lock. The answer's `bytes` and `changes` come from the second run, so they say what was written. The
function may refuse (it reaches `refuse` through the handler's `ctx`); the call then writes nothing.

With a value, the file is treated like `--replace`: checked, and refused when it changed.

### Several files

One commit takes one lock (or one per root, in the order of their real paths, so two calls can
never wait on each other in a circle), runs one check for all files, writes one journal, writes
and syncs every temporary file, and only then moves the first one in. The example
`notes add indexed` (a note and the index) goes through this path in every experiment below.

## Lost updates: the decision and why

| Option | What it closes | Measured (20 writers, 100 calls each) |
| :--- | :--- | :--- |
| Read, change, temporary file, rename (docker) | half-written files only | 1702 of 2000 lines lost |
| earlier design: identity check before the rename, no lock | changes before the check | 625 of 954 acknowledged lines lost, 1046 refused |
| Lock around check and rename, value checked | everything among adx writers | 0 lost, 285 refused |
| Lock, function recomputed under the lock | everything among adx writers | 0 lost, 0 refused |
| Lock from plan to commit | everything | not measured: blocks every call for the plan's seconds |

**Decision.** Every commit takes the root lock and runs the check under it. `files.update` with a
function is recomputed under the lock instead of being checked. This is adx's default and has no
switch; the author picks per file by the form of `update`.

**Why the check alone is not enough.** The earlier design expected "a window of a few system calls". The
window is small, but 20 processes each spend part of their time inside it, and two windows overlap
often. The experiment lost two thirds of the acknowledged lines; with 5 ms of plan between read and
commit it still lost 78 of 297. Each of those calls answered `ok` for a line that is gone.

**Why a lock alone is not enough.** The plan reads before the lock. A lock only puts the renames in
a row; each still writes content computed from an old read, so the last one wins as before. The
check under the lock is what ties the write to the read.

**Why not hold the lock from plan to commit.** `plan` can render a .docx or run LibreOffice for
seconds, and `apply` waits for a server. Every other call of the tool would wait that long, and a
dry run would have to lock, which rule 5 forbids (it may create nothing). The short lock is held
for 0.8 ms at the median without `fsync`, 31 ms with it.

**Why recompute instead of refusing.** Two `notes add` do not conflict: both lines belong in the
index. Refusing one costs the agent a turn for nothing. With a 5 ms plan, the checked form refused
1707 of 2000 calls; the function form refused none. Recomputing is safe because `change` sees only
the file's current text and the call's input; anything else it uses comes from reads the plan made
through handles, and those are checked.

**Per root, not per file.** git and kubectl lock per file. adx locks per root:

- one lock file per root, not one beside every file of the person's folders;
- a commit of several files needs all their locks anyway, which per file means sorting them and
  many lock calls (kubectl sorts for this reason);
- the lock is held for milliseconds, so putting unrelated files of one root in a row costs nothing
  an agent notices.

**The kernel lock, not a lock file with `O_EXCL`.** git and kubectl create `<file>.lock` with
`O_EXCL`; whoever creates it holds the lock. A process killed while holding it leaves the file, and
every later call must decide whether its owner is dead. With pid, host and boot time in the file,
that works on one machine, but not for a process in a container (its own pids and host name) or on
another machine sharing the folder: adx would wait and then ask the person. Two waiters that both
decide "stale" at once can also both take over. The kernel lock has none of this: the kernel drops
it when the process ends. Node has no `flock` or `fcntl` call of its own; `node:sqlite` is the one
built-in that takes such a lock, and the prototype uses only `BEGIN IMMEDIATE` and `ROLLBACK` on an
empty file. The cost:

- `.adx.lock` stays in the root (0 bytes). It must not be deleted while a call runs: a deleted lock
  file and its replacement are two inodes and two locks.
- A process drops all its locks on a file when it closes any descriptor of that file (a POSIX rule).
  adx never opens `.adx.lock` itself after creating it, refuses it as a path, and hides it from
  `root.list`.
- `node:sqlite` is not yet marked stable in Node 24 (it loaded without a warning in 24.21). The lock
  is one function; the `O_EXCL` file can replace it without touching anything else (open question 1).

macOS also knows an `open` flag `O_EXLOCK` that takes a kernel lock, but Linux has none, so adx does
not use it.

**What no lock stops.** An editor, `sed -i` or another tool does not ask for adx's lock. The check
under the lock still sees every such change that finished before it. A change that lands in the
microseconds between the check and the `rename` of a replaced file is lost; for a new file, `link`
closes even that gap.

## Version: stat or hash

**Decision: the hash.** adx keeps the SHA-256 of the bytes the plan read and compares it under the
lock. A different size answers "changed" without reading; an equal size is read again. Times and
inode numbers are not compared at all, so a `touch` or an identical rewrite is no conflict.

The identity `(dev, ino, size, mtimeNs)` of the earlier design misses these changes:

| Case | Measured here | Why |
| :--- | :--- | :--- |
| A restored copy that keeps its time (`cp -p`, `rsync -t`, `touch -r`, a backup restored in place) | APFS: identity SAME, hash differs | the program sets `mtime` back; `ctime` would catch it |
| Two same-size writes within one tick of the file clock, FAT32 | 1999 of 2000 pairs kept `mtime` and `ctime` | FAT32 stores times in steps of 2 s |
| The same, exFAT | 1959 of 2000 pairs | steps of 10 ms |
| The same, APFS | 0 of 2000 pairs; smallest step seen 0.1 ms | nanosecond times |
| Linux ext4 | not measured | the kernel stamps files from a clock that moves once per scheduler tick (1 to 10 ms); a freed inode number is soon reused, so `(ino, size, mtime)` can repeat for another file |
| NFS | not measured | the client caches a file's attributes for 3 to 60 s, so `lstat` may answer old values; an `open` asks the server again, so a re-read sees the new bytes |

Adding `ctimeNs` fixes the first row, not the others. Between two adx writers the identity would
always differ, since every adx write makes a new inode; the hash is for writers outside adx and for
file systems with coarse clocks. The cost is one more read, under the lock, of each file the plan
read: microseconds for the usual JSON file, about a millisecond per megabyte.

A file the author reads with `node:fs` directly, not through a handle, is invisible to the check;
the guide already sends every read through one function (rule 4).

## Several files: how close to all or nothing

`rename` replaces one name in one step; no system call moves two. adx gets close with three parts:

- **Nothing moves before everything is ready:** the check, every temporary file and its `fsync`,
  and the journal come before the first move. A failure up to there leaves the folder untouched.
- **A failed move is undone.** Each replaced file kept its old inode under the backup name. On a
  failure adx goes back over the moved files in reverse: `rename(backup, target)` puts an old file
  back in one step; a new file is removed with `unlink` after `lstat` shows it is still the inode
  adx wrote. Then it removes the temporary files, the backups, the folders it created (`rmdir`,
  deepest first, only if empty) and the journal.
- **A crash is undone by the next write** (next section).

The answer to a failed move, from the experiment (the second file's folder lost its write permission
just before its move):

```json
{"ok":false,"kind":"ask",
 "state":"Nothing was changed: moving notes/b.md failed: EACCES, and index.md was put back. A temporary file could not be removed (notes/.b.md.35cfaacf6d43.adx-tmp (EACCES)); the next write removes it.",
 "issues":[{"code":"SYSTEM_REFUSED","path":"notes/b.md","message":"the system refused: EACCES","hint":"check the folder and its permissions"}]}
```

`index.md` held its old text again, and the next call removed the temporary file. Under design.md
today ("remove the temporary files and name what is already written") the same failure answers
`"Written before the failure: index.md."` and leaves `index.md` with the new line and no note; the
temporary file in the read-only folder then has no owner and stays.

If putting back fails too, `state` names each file that is new and could not be put back, the
journal stays, and the next write of the tool puts it back. design.md's line changes from "name in
state what is already written" to "put the moved files back; name in state only what could not be
put back".

What stays open: a program that reads several files during the milliseconds of the moves may see
the first file new and the second old. adx gives readers no snapshot of several files.

On a volume without hard links (FAT, exFAT, some network shares; `link` answers `ENOTSUP` or
`EPERM`), the backup is a copy of the old bytes, written and synced like a temporary file, and a new
file moves in with `lstat` (absent) and `rename`; under the lock only a writer outside adx can come
between the two.

## Crashes and leftovers

**What a killed process leaves.** During `plan`, `apply` or the wait for the lock: nothing (the
lock file may now exist, which is meant). During the commit: the journal, temporary files, backups,
and maybe some files already moved. The kernel has dropped the lock.

**What the next call does.** The next commit of any adx tool on that root takes the lock and finds
`.adx.journal`:

| Journal | Meaning | Recovery |
| :--- | :--- | :--- |
| no commit mark | no file moved | remove the temporary files |
| commit mark, every target holds its temporary file's inode | the commit finished | keep it, remove the backups |
| commit mark, some targets hold it | stopped halfway | put back each replaced file from its backup, remove each new file, remove the rest and the empty folders it created |

Then it removes the journal, syncs the folders, and goes on with its own commit. Its answer carries
`recovered`, such as `["put back index.md","removed .b.md.4e840c4af72f.adx-tmp"]`.

**Why undo and not finish.** The killed call never answered, so the agent believes nothing happened
and will call again. Finishing the old commit would make that retry fail with `ALREADY_EXISTS` or
add the line twice. A commit whose every move landed is kept: it is whole, and a read shows it.

**No guessing.** Every leftover name stands in the journal before the file exists (step 11), so
recovery removes exactly those names. It needs no age, no owner pid, and no search by name pattern.
The names are `.adx.lock` (stays), `.adx.journal`, `.<name>.<token>.adx-tmp` and
`.<name>.<token>.adx-old`, all hidden; `root.list` hides them and a path naming them is refused.

**Only a write recovers.** A read or a dry run must not write (rules 5 and 9), so it does not
recover. A read between a crash and the next write can see the half state; that window needs a
crash inside the milliseconds of a commit.

**Stale locks do not exist** (on a local disk). The kernel lock dies with its process. A lock
held by a live process that hangs makes other calls wait 10 s and answer `LOCKED`. SQLite does not
say which pid holds the lock, so the message names the root.

**Signals.** adx catches `SIGINT`, `SIGTERM` and `SIGHUP` from the start. The commit runs only
synchronous file calls, and Node runs a signal handler only when the event loop is free, so a
signal during the commit waits the few milliseconds until the commit is done or undone; the
answer is printed and the process exits with the answer's code (0 for `ok`), since the signal came
too late to stop anything. Before the commit (during `plan`, `apply` or the lock wait, which sleeps
asynchronously), the call stops as soon as the event loop is free: `INTERRUPTED`, kind `ask`, with
`state` naming a send that already happened. In the experiment, a `SIGTERM` during a commit slowed
to 1.5 s:

- with handlers, the commit finished and the `ok` answer was printed before the process ended (the
  prototype's handler then exited 143; adx would exit 0);
- with Node's default (no handler), the process died mid-commit with `index.md` changed and the note
  missing, and the next call put `index.md` back.

**Power cuts** (not tested here). The order of `fsync` calls gives three promises: a file under its
real name is never empty or half written (each temporary file is synced before its move); an `ok`
answer is on disk (the folders are synced after the moves); the journal is on disk before the first
move, so recovery after a power cut works as after a `SIGKILL`.

## Platforms

| | macOS APFS | FAT32, exFAT | Linux ext4 | Windows NTFS | NFS | SMB |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Tested here | yes | yes (disk images on macOS) | no | no | no | no |
| `rename` replaces in one step | yes | yes | yes | yes, unless the target is open elsewhere | yes, on the server | yes, unless the target is open elsewhere |
| `link` | yes | no (`ENOTSUP`) | yes | yes | yes | depends on the server |
| Kernel lock through SQLite | yes, dropped on `SIGKILL` | yes, dropped on `SIGKILL` | yes (`fcntl`) | yes (`LockFileEx`) | only with a lock manager | depends on client and server |
| File times | 1 ns, 0.1 ms steps seen | 2 s, 10 ms | one scheduler tick | 100 ns | server's, cached | server's |

**macOS (APFS), tested.** Everything above holds. Node's `fsync` is `F_FULLFSYNC`: about 4 ms each,
so a two-file commit with eight syncs held the lock 31 ms at the median, against 0.8 ms without.
APFS ignores case by default: `Index.md` and `index.md` are one file, which the per-root lock and
the byte check handle like any other name.

**FAT32 and exFAT, tested on macOS.** No hard links, so the fallback of "Several files" applies;
coarse times, so the hash matters. The kernel lock works and was dropped after a `SIGKILL`. macOS
writes an AppleDouble file `._.adx.lock` (4 KB) beside the lock file on these volumes.

**Linux (ext4), not tested.** `rename`, `link` and `fsync` behave as on macOS (`fsync` there flushes
the drive cache without a special call). Linux has `renameat2(RENAME_NOREPLACE)`, which would move a
new file in with one call, but Node does not offer it, so `link` plus `unlink` stays. The `fcntl` lock
is kept by the kernel for the file, not for a process namespace, so it also excludes writers in other
containers that mount the same folder on the same machine. A folder shared into a Linux VM (Docker
Desktop or colima on a Mac) is different: a lock taken inside the VM is not seen outside it, so a
process on the Mac and one in a container do not exclude each other.

**Windows (NTFS), not tested.** Node's `rename` is `MoveFileExW(MOVEFILE_REPLACE_EXISTING)`, which
fails with `EPERM`, `EACCES` or `EBUSY` while another program holds the target open without
`FILE_SHARE_DELETE` (a virus scanner, the search indexer, an editor). Node's own opens share delete,
so another adx call reading the file does not block it. adx retries such a failed move for up to
2 s, as `graceful-fs` (used by npm) does for up to 60 s, then answers `SYSTEM_REFUSED`, kind
`retry`, "index.md is open in another program". `link` is `CreateHardLinkW`, available on NTFS.
Node offers no reliable way to sync a folder on Windows, so folder syncs are skipped (NTFS logs its
own name changes). Modes map to the read-only bit only. A temporary name is about 20 characters
longer than the target, so a path near 260 characters fails at step 12, before anything moved,
where long paths are not enabled.

**NFS, not tested.** `O_EXCL`, `link` and `rename` work on NFS v3 and later. The lock goes through
the server's lock manager (NLM for v3, part of the protocol in v4) and works when that runs; a mount
with `nolock` keeps locks on one client, so two machines do not exclude each other, and adx cannot
tell. The hash covers the attribute cache. SQLite's own documentation warns that locking on network
file systems is often unreliable.

**SMB, not tested.** Byte-range locks are part of the protocol. Hard links depend on the server;
without them the fallback applies. A target open on the server blocks a `rename` as on Windows.

**Synced folders (iCloud Drive, Dropbox, OneDrive).** The lock holds on one machine only; the sync
client settles two machines' writes by keeping both copies. adx cannot see this. The guide says: a
root is written from one machine.

**What adx says when it cannot guarantee.**

- The lock call fails with an error (`ENOLCK` on NFS without a lock manager, `ENOTSUP`): adx refuses
  with `LOCK_UNSUPPORTED`, kind `ask`, "adx cannot lock <root>: its file system refuses locks; keep
  the folder on a local disk". It never writes without the lock.
- `link` is missing: the fallback runs without a message; among adx writers the guarantee is the
  same.
- `nolock` NFS, synced folders, a folder shared into a VM: adx cannot detect these; the guide names
  them.

## What the caller sees

| Code | Kind | When | `state` |
| :--- | :--- | :--- | :--- |
| `ALREADY_EXISTS` | `fix` | the plan finds the file and the call has no `--replace` (decision 10) | Nothing was changed. |
| `CHANGED_SINCE_PLAN` | `retry` | under the lock, a file the plan read, listed or will replace has other bytes, or a new file appeared | Nothing was changed. After a send: what was sent, and that no file was written. |
| `LOCKED` | `retry` | the root's lock was not free within 10 s | Nothing was changed. |
| `LOCK_UNSUPPORTED` | `ask` | the file system refuses the lock | Nothing was changed. |
| `SYSTEM_REFUSED` | `ask` (`retry` for a file open elsewhere on Windows) | a move failed | Nothing was changed: what failed and what was put back; else what could not be put back. |
| `INTERRUPTED` | `ask` | a signal before the commit | Nothing was changed, or what was sent. |

`CHANGED_SINCE_PLAN` names one issue per file (`path` is the file), the message "index.md changed
after this call read it", the hint "call again; the plan reads the new content", and as `command`
the same call. When the call carries `--replace`, the command adds `--dry-run`: the replacement
would now drop another writer's change, and the agent should see that first. After a send, the
command is the `look` step, never the same call (rule 10's lesson for `retry`).

A call that repaired an earlier crash says so in `recovered`, beside `ok` or `issues`.

What the agent does (rows for the agent skill, rules 8, 10 and 14):

- `CHANGED_SINCE_PLAN`: run the named command as it stands, at most 3 times, then ask the person
  ("another writer keeps changing index.md"). After a send, run the `look` step first.
- `LOCKED`: the same call after a few seconds, at most 3 times, then ask the person: a call of the
  tool seems stuck.
- `SYSTEM_REFUSED`, `LOCK_UNSUPPORTED`, `INTERRUPTED`: ask the person, with `state`.

A dry run is unchanged: no lock, no check, no file, no `.adx.lock` (rule 5). The real call plans
again; what the agent saw in the dry run is not carried over (open question 5).

## Experiments and results

All on this Mac: macOS 27.0.1, APFS on an internal SSD, Node 24.21.0, only `node:` built-ins. The
code lies in
`design/adx-write/` of this repository:
`write.ts` is the write path (plan record, lock, check, journal, moves, undo, recovery), the other
files drive it, and `results-*` hold the raw output.

### 1. Lost updates: 20 processes, 100 `notes add indexed` each

Each call writes a new note and appends one line to `index.md`. `node lost.ts <mode> 20 100 <gap>
<sync>` (all rows: `run-lost.sh`); the gap is a random pause of 0 to 2 × gap ms between the plan's
read and the commit. "Lost" counts lines whose call answered `ok` but which are not in the index.

| Mode | Gap | Answered `ok` | Lost | Refused |
| :--- | :--- | :--- | :--- | :--- |
| plain read, change, rename (`naive`) | 0 | 2000 | 1702 | 0 |
| plain | 5 ms | 2000 | 1883 | 0 |
| earlier identity check, no lock (`check`) | 0 | 954 | 625 | 1046 |
| earlier identity check | 5 ms | 297 | 78 | 1703 |
| lock, value checked (`lock-value`) | 0 | 1715 | 0 | 285 |
| lock, value checked | 5 ms | 293 | 0 | 1707 |
| lock, function recomputed (`lock-fn`) | 0 | 2000 | 0 | 0 |
| lock, function recomputed | 5 ms | 2000 | 0 | 0 |
| `lock-fn` with every `fsync` | 0 | 2000 | 0 | 0 |
| `lock-fn` with every `fsync` | 5 ms | 2000 | 0 | 0 |

A rerun with the final code gave the same picture: `lock-fn` 2000 answered, 0 lost; `check` 1042
answered, 614 lost. Every run of every mode left no temporary file and no duplicate line.

Lock times for `lock-fn`: held 0.8 ms at the median without `fsync` (p99 2.2 ms), 31.5 ms with it
(p99 38 ms). With `fsync` the 2000 commits took 65 s: one root takes about 31 commits a second, and
20 writers that never pause waited 0.4 s at the median and 4.7 s at the worst (flat poll; 20.7 s
with the first, growing back-off).

**Proves:** without a lock, the earlier identity check loses most acknowledged lines under contention;
the lock with the check loses none; recomputing under the lock also refuses none.

### 2. `SIGKILL` during a commit, and what the next call does

`node crash.ts`. A call adds "b" (replaces `index.md`, then creates `notes/b.md`) and is stopped at
a point of its commit, killed with `SIGKILL`, then a second call adds "c".

| Killed | Lock after the kill | Folder after the kill | Next call's `recovered` | Index after the next call |
| :--- | :--- | :--- | :--- | :--- |
| before the first move | free at once | journal, two temporary files | removed both temporary files | a, c |
| after the first move | free at once | `index.md` holds "b", backup, note's temporary file | put back `index.md`, removed the temporary file | a, c |
| after both moves | free at once | everything moved, backup left | kept a finished commit, removed the backup | a, b, c |

The next call took about 145 ms in all, Node's start included; its lock wait was under 0.1 ms.

**Proves:** the kernel drops the lock with the process; the journal is enough to undo a half commit
and to keep a whole one; no leftover stays.

### 3. `SIGTERM` during a commit

`node crash.ts` (second part). The commit is slowed to 1.5 s after the first move, and `SIGTERM`
arrives meanwhile.

- With handlers: the commit finished, the `ok` answer was printed, then the handler ran and exited
  143 (adx would exit 0 after an `ok`).
- With Node's default: the process died at once, `index.md` held "b" without its note; the next call
  answered `"recovered":["put back index.md","removed .b.md.….adx-tmp"]`.

**Proves:** a synchronous commit plus handlers makes `SIGTERM` wait for the commit (`SIGINT` and
`SIGHUP` go through the same handlers, not run separately); without handlers it acts like
`SIGKILL`, and the journal still repairs it.

### 4. The second move fails

`node fail.ts`. Just before the second move, the note's folder gets mode 0500, so `link` answers
`EACCES` from the kernel.

- With undo: `state` "Nothing was changed: moving notes/b.md failed: EACCES, and index.md was put
  back. A temporary file could not be removed (...); the next write removes it." `index.md` held its
  old text. After the folder was writable again, the next call removed the temporary file and wrote
  its own note.
- Without undo (design.md today): `state` "Written before the failure: index.md. ..."; `index.md`
  held "b" and no note existed; the temporary file had no journal and stayed.

### 5. Stat identity against the hash

`node stat.ts <folder>` on APFS and on FAT32 and exFAT disk images made with `hdiutil create -fs`
(they lie in `vols/`; `hdiutil attach -nobrowse -mountpoint vols/mnt-exfat vols/exfat.dmg` mounts
one again; `run-2.sh` expects `vols/mnt-msdosfat32`).

| Volume | Restored copy, same size, old `mtime` | Same-size write pairs with equal `mtime` | Equal `ctime` | `link` |
| :--- | :--- | :--- | :--- | :--- |
| APFS | identity SAME, `ctime` differs, hash differs | 0 of 2000 | 0 of 2000 | yes |
| FAT32 | identity SAME, `ctime` SAME, hash differs | 1999 of 2000 | 1999 of 2000 | `ENOTSUP` |
| exFAT | identity differs | 1959 of 2000 | 1959 of 2000 | `ENOTSUP` |

**Proves:** `(dev, ino, size, mtimeNs)` misses real changes on every volume tested, and adding
`ctime` only fixes APFS; the hash sees all of them.

### 6. The kernel lock and the fallback on FAT32 and exFAT

`node probe/holdlock.ts` on both images: a second process was refused while the first held the
lock, and after a `SIGKILL` the next process got it at once. On FAT32, 20 processes × 50 calls:
`lock-fn` lost 0 of 1000 and refused none (with `fsync`; moves through the fallback, since `link` is
missing), `lock-value` lost 0 and refused 802, `naive` lost 941 of 1000.

### 7. What one `fsync` costs here

`node fsync.ts`: writing 16 bytes takes 0.04 ms; with `fsync` of the file 4.0 ms at the median
(`F_FULLFSYNC`); `fsync` of an unchanged folder 0.04 ms. A two-file commit makes four file syncs
(journal twice, two temporary files) and four folder syncs after changes; at about 4 ms each that
gives the 31 ms above (a folder sync after a change was not timed alone).

### Not tested

- **Windows, Linux, NFS, SMB:** no such system or server here. Their sections above come from the
  documented behaviour of the system calls and of Node's `libuv`, not from a run.
- **Power cuts:** the order of `fsync` calls follows the usual rule, but no power was cut.
- **Writers outside adx** (an editor saving in place) racing the microseconds between check and
  rename: argued, not measured.
- **The `O_EXCL` lock file** of open question 1: not built.
- **Several roots in one commit:** designed (locks in path order), not built.
- **The real API:** the prototype is the write path only; `files.update` and the codes are typed
  nowhere yet. It creates target folders before the lock, not under it as step 12 says, and it
  does not retry a move on Windows.

## The API change for the author

**Before** (the earlier design, with the example `notes add indexed`):

```ts
plan: (note, { files }) => ({
  note: files.write(note.file, render(note)),
  index: files.update(home.file('index.md'), indexWith(note)), // indexWith reads index.md in plan
}),
```

**After:**

```ts
const INDEX_LIMIT = 1_048_576;
const line = (note: Note) => `- [${note.title}](${note.file.rel})\n`;

plan: (note, { files }) => ({
  note: files.write(note.file, render(note)),
  index: files.update(home.file('index.md'), INDEX_LIMIT, index => index + line(note)),
}),
```

```ts
export interface Files {
  write(file: File, data: string | Uint8Array, options?: { mode?: number }): Written;
  /** Changes an existing file. adx runs `change` in plan for the answer, and again under the lock
   *  on the text it finds then, so a parallel change is kept, not refused. */
  update(file: File, limit: number, change: (old: string) => string): Written;
  /** Changes an existing file to `data`. Refused with CHANGED_SINCE_PLAN if the file changed after
   *  plan read it. */
  update(file: File, data: string | Uint8Array): Written;
}
```

`change` gets the file's text and returns the new text. It must not read or write files itself; what
it needs beyond the text comes from the input or from reads the plan made through handles, which
the check covers. It runs under the lock, so it must be quick.

The first index: decision 12 says `update` never creates, so the author writes the branch:

```ts
const index = home.file('index.md');
index: index.exists
  ? files.update(index, INDEX_LIMIT, text => text + line(note))
  : files.write(index, '# Notes\n' + line(note)),
```

Two first calls at once: the second one's `link` finds the file, it answers `CHANGED_SINCE_PLAN`, and
its retry takes the `update` branch (open question 4).

**Nothing else changes for the author:** no lock option, no root option; the lock, the check, the
journal and the recovery are adx's. For the caller there are three new codes (`LOCKED`,
`LOCK_UNSUPPORTED`, `INTERRUPTED`) beside `CHANGED_SINCE_PLAN`, and the field `recovered`.

**Rules.** 5 holds (a dry run takes no lock, checks nothing, creates nothing). 9 holds, stronger: a
failed move and a crash are undone, and no commit lands on a file that changed since the plan. 10
holds: `CHANGED_SINCE_PLAN` and `LOCKED` are `retry` with `state`, and after a send the command is
the `look` step. 11 holds, stronger: what is written is what the plan showed, or recomputed under
the lock and answered as written. design.md's "When a later rename fails, ... name in 'state' what
is already written" becomes "put the moved files back; name in 'state' only what could not be put
back".

## Open questions for the owner

Each with the recommended answer first.

1. **The lock.** Recommended: the kernel lock through `node:sqlite`; no stale lock can exist, and it
   holds across containers on one machine. The other answer: an `O_EXCL` lock file with owner pid,
   host and boot time, as git and kubectl do; it needs no module that is not yet stable and exists
   only during a commit, but a killed owner leaves it, its liveness cannot be checked from another
   container or machine, and two waiters may take over one stale lock at once.
2. **Undo a half commit.** Recommended: yes, with backups (hard links) and the journal; a failed move
   and a crash leave the folder as before the call. The other answer: design.md as it stands, name
   what is written; no backup and no journal, but the index can keep a line whose note is missing
   until a person looks.
3. **Sync to disk.** Recommended: every temporary file, the journal and the folders; 31 ms per
   two-file commit here, invisible beside an agent's turn. The other answer: only the temporary
   files (no torn file after a power cut, but an `ok` answer may vanish and the journal may be
   lost), or no sync at all (0.8 ms; a power cut can leave an empty file under the real name).
4. **May `files.update` create the file?** Recommended: no, decision 12 stands; the first-index race
   costs one retry, once per root. The other answer: `files.update(file, limit, change, { create:
   true })`, where `change` gets `undefined` for a missing file; no branch and no retry, but `update`
   then creates, which decision 12 rules out.
5. **Carry the dry run's view to the real call?** Recommended: no; the real call plans again and its
   answer says what it changed. The other answer: the dry run's next step carries a token of what it
   read (`--expect <hash>`), and the real call refuses with `CHANGED_SINCE_PLAN` when anything
   differs; that also covers the minutes an agent or a person spends deciding, but the next step is
   no longer "the same call without the flag" (rule 5's lesson).
6. **A file system that refuses locks.** Recommended: refuse with `LOCK_UNSUPPORTED`, kind `ask`. The
   other answer: a variable the person sets to write without a lock; it helps on an old NFS server,
   but an agent can put the same variable in front of a command.
7. **Re-plan by itself on `CHANGED_SINCE_PLAN`?** Recommended: no; the agent's retry is one turn,
   and `files.update` with a function already removes the common case. The other answer: adx runs
   `plan` again up to 3 times for an effect without `apply`; it saves the turn, but `plan` may then
   run several times per call, and a slow plan under heavy contention can keep losing.
