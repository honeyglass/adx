# Build plan: adx

Builds the toolkit that `proto/adx/index.d.ts` and `proto/adx/test.d.ts` declare, so that every
example under `proto/` runs. The design is settled in `design/decisions.md` (1 to 81); this plan
only cuts the work into packages. The main session of Claude Code is the coordinator; per
package it starts one Opus sub-agent as worker and one fresh Opus sub-agent as
reviewer, at effort high or medium by the package's complexity, one package at a time.

## Rules for the run

- **The design is fixed.** Nothing in `decisions.md` or `index.d.ts` changes during the build.
  A worker or reviewer who finds that a decision cannot work as written stops and reports; the
  coordinator asks the person and does not decide.
- **Tests first.** Each package writes its api tests from `index.d.ts` and its doc comments, sees
  them fail, then writes the code (`~/.claude/rules/testing.md`).
- **Layout.** `~/.claude/rules/ecmascript/layout.md`: one folder per feature, a feature imports
  only from `core/`, one file per job, an `index.ts` per folder, zod enters each feature in one
  file, only `node/` imports `node:` modules.
- **Code rules.** `~/.claude/rules` in full; no native try, `.catch(` or `.then(`; `$try` and
  `trySync$` from `@honeyglass/utils/ts`; throw only `RefusalError` or rethrow.
- **One review round.** After a package's tests and checks are green, one fresh Opus sub-agent
  (effort high or medium, by complexity) reads the package's diff for bugs and unexpected behavior. No
  red-team reviewer, no second round.
- **The reviewer reports, it does not decide.** Each finding names file, line, the failing input
  and what happens. A finding that would change a decision goes to the person, not to the worker.
  The same worker (continued, not a new one) fixes the other findings; then the coordinator checks only that tests and checks are
  green, and ticks the package.
- **Commits.** Only through the person's `/lean-code:commit`; the coordinator asks once per
  package, after its review fixes.

## Layout

```text
src/
  index.ts      barrel
  api.ts        public values
  types.ts      public types
  core/         answer, Kind, exit codes, Issue, Refused, code(), failed(), status()
  command/      read, list, effect, global(), argv, --json, --fields, --dry-run, --help
  steps/        Step, tell, schema.step, after, hint, needs, carry, lists
  values/       Source, needs(), fresh(), keyOf, detailOf, options that list (rule 13)
  shapes/       check(), shapes, the schema command, raw JSON input, SCHEMA
  files/        roots, dir, inFile, outFile, files.write, files.update, plan, --replace
  list/         Page, Listing, paged, --page
  remote/       remote(), bearer, envUrl, get and the requests, on, status(), blocking
  stored/       stored kinds, format numbers, migration
  tool/         tool(): puts the features together, the start answer, main(), start checks
  node/         adapter: argv, stdout and TTY, node:fs, fetch (subpath ./node)
  test/         run, fake, reply, conformance (subpath ./test)
tests/
  api/          <feature>.api.spec.ts
  e2e/          the proto tools run as real processes
```

The package exports `.`, `./node` and `./test`, and checks in `dist/` (decision 75).

## Packages

Each package ends when its boxes are ticked, its tests and the checks are green, and its review
round is done. The e2e line names the tests the package turns green.

### P0 setup
- [x] `src/` layout as above, `tsconfig` for `src/` beside the one for `proto/`
- [x] build to `dist/`, the three exports, `dist/` checked in
- [x] the import boundaries checked by a test (as oriko's `tests/api/layout.api.spec.ts`)
- [x] `tests/e2e/`: runs `proto/hello.ts`, the examples, `proto/ship` and `proto/oriko` against
      `dist/` and asserts the answers the guide shows; all red
- [x] the scripts `test`, `build`; CI runs them

### P1 core and node
- [x] the answer shape, `Kind`, exit codes 0, 1, 2
- [x] `Issue`, `Refused`, `code()`, `failed()`, `status()`
- [x] a minimal `tool()` and `main()`: a bug becomes `UNKNOWN_ERROR`, kind `bug`, exit 2 (76)
- [x] `node/`: argv, stdout, TTY detection, JSON when piped
- [x] `test/run()` (74)
- e2e: hello

### P2 command
- [x] `read`, `list`, `effect`, the `commands` table, `global()`
- [x] argv parsing, unknown commands, options and words refused (rule 15)
- [x] `--json`, `--fields`, `--dry-run`, `--help`, reserved names (71)

### P3 steps
- [x] `Step`, `tell`, `next`, `start`
- [x] `after` for one command and for a list (80)
- [x] `hint` (73), `needs`, `carry` with its rules (79), `lists`, `schema.step` (77)

### P4 values
- [x] `Source`, `needs()`, `fresh()`, `keyOf`, `detailOf`
- [x] an option without its value lists its values (rule 13)

### P5 shapes
- [x] `shapes` (72), the `schema` command
- [x] raw JSON input (rule 1)
- [x] `check()` with `as` (78), SCHEMA issues with paths (69)

### P6 files
- [x] roots, `envDir`, `marker`, `cwd`, `dir`, `inFile`, `outFile`
- [x] `files.write`, `files.update`, `plan`, all or nothing (rule 9)
- [x] `--replace`, `replace: 'always'` (70), same bytes write nothing (81)
- [x] `id()` and `multiline()`, the field schemas declared beside `dir` and `inFile`
- e2e: examples/datafolder

### P7 list
- [x] `Page`, `Listing`, `paged`, `--page`, outline and `--fields` (rule 16)

### P8 remote
- [x] `remote()`, `bearer`, `envUrl`, `get` with `on`, the requests, `status()`
- [x] `test/fake`, `test/reply`
- [x] no request during a refusal (79)
- e2e: ship

### P9 stored
- [x] `stored()`, format numbers, older formats converted, newer refused

### P10 finish
- [ ] the start checks: utils present (75), hint and schema names known (73, 77)
- [x] `test/conformance`
- [ ] `dist/` built and checked in, README install line points at a real sha
- [x] `tests/e2e/oriko.e2e.spec.ts` removed: proto/oriko stays type-only and never runs, since
      it imports functions it only declares (the person, 2026-11-23). The real oriko, migrated
      onto adx after this build, is the acceptance test, with its behavior golden.

## Order

P0 and P1 run alone, in this order; P1 creates `tool/`, `api.ts` and `types.ts`. Each of P2 to P9
writes its feature folder and also wires the feature into `tool/`, `api.ts` and `types.ts`, so two
of them would own the same files. They therefore run one after another, in the order above. P10 runs last.

## Checks per package

- `pnpm run typecheck`, `pnpm run format:check`, `pnpm test`
- the blocks check of the docs, as long as `proto/` still holds the examples
- no `throw new Error`, native `try {`, `.catch(` or `.then(` in `src/`
