# adx

A TypeScript toolkit for command-line tools that AI agents drive, with the Agent DX rules built in.
It is designed, not built: the repository holds its guide, its design notes and a type-only prototype.

## Folders

- docs/: the user guide (`guide.md`, and `guide.de.md`, its German translation), the German cheat
  sheet and the German page of old against new API.
- design/: `decisions.md`, the owner's decisions, which override every other file; the reviews; the
  research on data folders; the design of parallel writes and its experiments in `adx-write/`.
- proto/: the type-only prototype. `proto/adx/index.d.ts` declares the API, `proto/tsconfig.json`
  maps `@honeyglass/adx` onto it, and the example files use it as an author would.

## Changing the API

- A change starts in `design/decisions.md`, as a new decision or a change of one, each reading on its own.
- Then the prototype, then `guide.md`, `guide.de.md` and `cheatsheet.de.md` in the same change.
- Every `ts` block of the guide, of the cheat sheet and of the "Nachher" blocks stands line for line
  in a file of `proto/`. A case that must not compile stands behind `@ts-expect-error`.
- `guide.de.md` says what `guide.md` says, with the same code blocks.
- The 16 Agent DX rules are defined in honeyglass/skills, `adx/cli/references/rules.md`; read them
  there. The README lists each in one line, with its source; a change of a rule there changes that
  line too. Copy nothing more of them here.

## Checks

Run `pnpm run typecheck` and `pnpm run format:check` before a commit.
