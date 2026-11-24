# adx

A TypeScript toolkit for command-line tools that AI agents drive, with the Agent DX rules built in.
It is being built from its design: the repository holds its guide, its design notes, a type-only
prototype, and the code with its tests.

## Folders

- docs/: the user guide (`guide.md`, and `guide.de.md`, its German translation), the cheat sheet
  (`cheatsheet.md`, and `cheatsheet.de.md`, its German translation) and the German page of old
  against new API.
- design/: `decisions.md`, the owner's decisions, which override every other file; the reviews; the
  research on data folders; the design of parallel writes and its experiments in `adx-write/`.
- proto/: the type-only prototype. `proto/adx/index.d.ts` declares the API, `proto/tsconfig.json`
  maps `@honeyglass/adx` onto it, and the example files use it as an author would.
- src/: the code, built by `pnpm run build` into dist/, which is checked in, so a tool installs adx
  from GitHub with no build step. `design/build-plan.md` cuts the work into packages.
- tests/: `api/` checks the import rules of src/, that dist/ is its build and, in the typecheck,
  that the built types fit `proto/adx/` and every file of `proto/` compiles against dist/;
  `e2e/` runs the proto tools as programs against dist/; `fixtures/` holds the tools the api
  test of `conformance` probes.
- tsconfig.base.json: the base a tool extends as `@honeyglass/adx/tsconfig.json`.

## Changing the API

- A change starts in `design/decisions.md`, as a new decision or a change of one, each reading on its own.
- Then the prototype, then `guide.md`, `guide.de.md`, `cheatsheet.md` and `cheatsheet.de.md` in the
  same change.
- Every `ts` block of the guide, of the cheat sheet and of the "Nachher" blocks stands line for line
  in a file of `proto/`. A case that must not compile stands behind `@ts-expect-error`, in a
  file `<name>.types.ts` beside the file it checks: the typecheck reads it, and nothing runs it.
- `guide.de.md` says what `guide.md` says, and `cheatsheet.de.md` what `cheatsheet.md` says, each
  with the same code blocks.
- The 16 Agent DX rules are defined in honeyglass/skills, `adx/cli/references/rules.md`; read them
  there. The README lists each in one line, with its source; a change of a rule there changes that
  line too. Copy nothing more of them here.

## Checks

Run `pnpm run build`, `pnpm run typecheck`, `pnpm test` and `pnpm run format:check` before a
commit. `pnpm test` fails when dist/ is not the build of src/.
