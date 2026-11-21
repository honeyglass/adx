# Answers to the questions of review-final.md

The owner's answers to the 11 questions for the owner in `review-final.md`, given on 2026-11-21 in a
fork of the main session. They are not yet in `decisions.md`; the main session records them there
under "Made" as the next numbers, each with "question N of review-final.md".

1. **Deleting a file: B.** `files.remove` comes later. The guide names the gap under "Known limits".
2. **The answer of `apply`: A.** The real run answers `{ ...planned, ...applied }`: everything the dry
   run answered, plus what `apply` returns. The dry run and the real run have the same fields (rule 5).
3. **`act.write` and `act.update`: A.** Both leave v2. Files exist only in `plan`, sends only in
   `apply`, so no refusal comes after a send. A tool that needs it later gets a design of its own.
4. **Rule 16 for `read`: A.** An optional `output` schema on `read` turns on `--fields`. The test kit
   fails when a `read` answers a long list or a large document without `output`.
5. **The refusal for missing fields (`needs`): A.** Issues only, in the one error shape of design.md:
   one issue `MISSING_VALUE` per missing field, with `path`, `hint` and `command` (the command that
   lists the field's values). No `needs` and no `next` in this refusal; `next` belongs to a success.
   This changes the answer shape of decision 14; `needs('project', 'team')` in the code stays.
6. **`option: false`: C.** The switch goes. Every data folder can be moved with `--home`, and `next`
   always carries it. Reason: the switch protects nothing (an agent can set the variable just as
   well), and a name clash is solved by renaming the option. This changes decision 13: its point
   "an author can switch the option off per root with `option: false`" is dropped.
7. **The form of `files.update`: A.** `files.update(file, limit, old => next)`: adx reads the file
   itself, with the limit, and calls the function. With the later lock (TODO #12 in
   honeyglass/skills) adx calls it again under the lock with the current content, and the API does
   not change. Until then a parallel change can still be lost.
8. **Renames before the first release:**
   - a) `Friend.text(value)` becomes `Friend.stringify(value)`; `text` would otherwise mean three things.
   - b) `listedBy(list)` becomes `keyOf(list)`, and `oneOf(list)` becomes `detailOf(list)`.
   - c) The type names `File`, `Request` and `Issue` stay. In the tracker example, its own schema is
     named `Ticket`.
9. **The command of the `ALREADY_EXISTS` refusal: A.** The command is the call with
   `--replace --dry-run`, so the agent sees in `changes` what would be lost and can ask the person
   before it replaces. For later: the future README.md of the package, the skill for building with
   adx and an `llms.txt` (the standard of https://llmstxt.org/) explain this flow for agents.
10. **The kind of `ROOT_NOT_FOUND` after a wrong `--home`: A.** It stays `ask`: one code, one kind,
    the safe side.
11. **A refusal without a field: A.** A new `code.issue(message?)` for a refusal that concerns no
    field; it has no `path`. `.at(field)` still always requires a field.

## Further answers, beyond review-final.md

12. **The line count of oriko in the core idea of the guide: counted, and fixed.** The old claim
    "about 1,800 lines" came from an early plan and was never checked. Two subagents counted
    independently at oriko 630c0b5, file by file in `cli/`, `core/` and `bin/oriko.ts`, only the
    lines that know nothing of CVs:
    - all lines: 1,457 and 1,461; without blank lines: 1,321 and 1,328; without blank and
      comment-only lines: 954 and 959;
    - tests of these parts: 541 and 630 (the second count includes the shared test harness).
    - Not counted: a safe https download and text cleaning in `read/` (about 270 more lines), since
      downloading was not on the list.
      Line 32 of `guide.md` and `guide.de.md` now reads "about 1,450 lines (about 950 without blank and
      comment lines), and about 600 lines of tests for them".
13. **Rule 6 in the cheat sheet and the guide: A.** Instead of "16 rules built in": adx builds in 15
    rules; rule 6, the agent skill, is the author's, and adx only checks that a named skill file
    exists and has a frontmatter (finding M5 of review-final.md).
14. **Outdated files: deleted** (moved to the macOS Trash on 2026-11-21). Gone: the first guide and
    everything before v2 (`docs-ts/guide.md`, `guide.de.md`, `cheatsheet.de.md`, `notes.md`,
    `simplify.md`, `proto/`), `docs-ts/v2/simplify.md`, `datadir.md`, `datadir-doc.de.md`, the folder
    `plans/` (written for Go) and the folder `evidence/` (the Go probes, the first simplify pass's
    prototypes and the oriko line count). `decisions.md` overrides them, and the guide holds the
    data folder section. The README is updated.
    Other files still name the deleted ones: `decisions.md` (nearly every decision says "open question
    N of `simplify.md`" or "of `datadir.md`"), `concurrency.md`, `review-final.md`, `review-docs.md`,
    `datadir-research.md` and a comment in `adx-write/worker.ts`. Each such reference is cleaned up so
    that every decision and finding reads on its own, without a file that no longer exists.

## A clarification, not a new decision

`--dry-run` is a core function. adx gives it to every `effect`, for every combination of arguments,
without code from the author, and it cannot be switched off. `read` and `list` refuse it as an
unknown option.

## Still open, not discussed

- The interpretations of the docs agent that do not overlap with the 11 questions (its points 2, 5,
  6, 7, 8, 9 and 11: the default folder may be missing, the form of the `skill` path, how stored
  kinds register and where the fingerprint file lives, `FILE_NOT_FOUND`, `--replace` on a call that
  writes no file, the shape of `changes`, retry numbers in `api`).
- `api.get` with `on` instead of `find` (under "Proposed, not yet confirmed" in decisions.md).

## Next

1. Record the answers above in `decisions.md`, and change decisions 13 and 14 as points 5 and 6 say.
2. Clean up the references to the deleted files, as point 14 lists them.
3. Put the open points above to the owner as one list to confirm.
4. Let a Fable subagent (high) bring the v2 docs and the prototype in line with these decisions and
   with the findings of `review-final.md`, with tsc and a review of its own at the end.
