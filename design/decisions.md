# adx v2: decisions of the owner

The owner's decisions on the v2 API, in the order they were made (2026-11-20 and 2026-11-21).
They override every other file in this folder. Each decision reads on its own; where a later one
changes an earlier one, both say so.

## Made

1. **TypeScript with Zod.** Field references are keys of the inferred type.
2. **No CLI framework; argv through `util.parseArgs`** (strict: false, tokens: true). adx checks the
   tokens itself: an option followed by another option counts as given without a value, an unknown
   option is collected and reading goes on, all mistakes of a call come back in one answer.
   Routing and help come from adx's own command table.
3. **`unbash` in the test kit** splits every command a tool names in `next` or in a hint into shell
   words, and the kit checks that adx knows each call.
4. **The agent skill is not part of the toolkit.** adx never reads, embeds or prints a skill.
5. **No `guide` or `help` text in the tool.** The first steps come from `next` in the start answer
   (rule 14, `hello.start(...)`) and from hints in refusals; care that is no step belongs in the skill.
6. **RxJS under the hood of `api`.** Retries, timeouts and cancelling several requests run on RxJS
   inside adx; the author never sees it. `api` stays its own thing rather than plain `fetch`: it checks
   every answer against a schema, maps a status to a kind, sends only through `act.send` in `apply`
   (so a dry run cannot send), and lets the test kit fake the server.
7. **`skill` is optional, a path.** Without it there is no skill and nothing is checked. With it, the
   test kit checks that the file exists and that it is a skill: a frontmatter with `name` and
   `description`. The kit does not read the commands, options or codes in it; the tool explains
   itself, and an agent finds out the rest from it. Rule 6 keeps its basic form; its strong form
   ("a test keeps the manual in step") is left to the author's own test. See also 34.
8. **No rows for codes in the skill**, since the kit does not read the skill.
9. **Options and `--json` in one call**: both fill one object; a field given by both is refused
   (`REPEATED_OPTION`). An agent can then append JSON to a command the tool proposed, without
   rewriting it.
10. **Replacing a stored file**:
    - Whether a file is replaced is decided by the write alone, not by `fresh`. If the file exists,
      `files.write` refuses without `--replace`, with the hint "add --replace to overwrite <name>".
      With `--replace` it replaces, and the plan shows "replaces". The refusal already comes in
      `plan`, so also in a dry run.
    - `fresh` refuses nothing any more. It only lists the taken names when `--name` comes without
      a value (rule 13).
    - `files.put` is renamed `files.write`, since "put" sounds like HTTP.
    - `--replace` is not one of the 16 rules. It implements design.md's "A command that replaces
      stored data needs a flag"; the name `--replace` is adx's choice.
11. **`global` holds for every command, and one command can deviate**:
    - `tool({ global: { input } })` gives every command the option, such as `--project`.
    - A command with `global: false` does not take it (such as `whoami`).
    - A command can make a global field optional: `global: { project: 'optional' }`.
    - `schema` shows per command whether it takes the option; adx carries the value only into
      steps to commands that have it.
    - No `tracker.with(...)`.
    - Type-checked in `proto/global.ts` (tsc 5.9.3, Zod 4.6.5): the default types `project` as
      `string`; with `global: false`, reading `project` in `run`, refusing at it, and passing it to
      `invoke` do not compile; with `'optional'`, `run` sees `string | undefined`; a typo such as
      `{ projekt: 'optional' }` does not compile. What `schema` shows and the carrying of the value
      into steps are runtime behaviour and not checked.
12. **`files.write` and `files.update`, both**:
    - adx supports both. Whether and how a tool uses them is decided by its use case.
    - `files.write`: for commands that create something new. If the file exists, adx refuses
      (`ALREADY_EXISTS`, hint "add --replace to overwrite <name>"); with `--replace` it replaces.
    - `files.update`: for commands whose purpose is to change (edit, update, append). No `--replace`.
      If the file is missing, adx refuses; `update` never creates anything silently. Its form: 29.
    - With both, `plan` shows what changes, and a dry run writes nothing.
    - Models: docker context create/update, gh alias set --clobber, git config --append/--replace-all.
    - Rule of thumb for the later skill for building with adx: add/create/save → `write`,
      edit/update/append → `update`.
13. **The data folder moves by variable and by option** (changed by 28):
    - The data folder can be moved by a variable (`HELLO_HOME`) and by an option (`--home`);
      the option wins, as with kubectl and docker.
    - adx carries the folder into every command it names in `next` or in a hint as soon as it is
      not the default, whether the variable or the option set it.
    - Reason: in Claude Code a variable does not survive from one shell call to the next, so a `next`
      command followed word for word would otherwise land in the real data.
    - A missing folder is refused (`ROOT_NOT_FOUND`), never silently replaced; its kind: 32.
    - Every data folder can be moved with `--home`; there is no switch to turn the option off (28).
    - This lifts the earlier rule "no option can move a root".
14. **A source names every field that is surely missing** (its answer shape changed by 27):
    - `needs` may name several fields: `needs('project', 'team')`. It does not have to; the author
      names what is surely missing at that point. Whether a second field is needed can depend on the
      value of the first (project "shop" has teams, "blog" has none); then the source names only
      `project` first.
    - The CLI refuses with all surely missing fields at once, one issue per field (rule 7: all errors
      in one answer); the shape of that refusal is 27.
    - `needs` names only fields the command has; `needs('tema')` does not compile. An option the
      command does not have stays `UNKNOWN_OPTION` (rule 15).
    - Reason: the building agent loses nothing (it can still name one field), and the using agent saves
      one call per field that is known from the start.
    - Models with two fields: gcloud (instances by project and zone), kubectl (containers by pod and
      namespace). These tools silently guess a default for a missing field; adx names it instead.
    - Type-checked in `proto/needs.ts`: `needs` with one and with two fields; `needs()` without a
      field does not compile; a typo `needs('project', 'tema')` does not compile. The typo's error
      stands at the `values` line that uses the source, not at the `needs` call, and it runs four
      lines without a "Did you mean".
15. **Two renames**:
    - `text()` becomes `multiline()`: the schema for text with line breaks.
    - `.run(step)` on an issue becomes `.command(step)`: it attaches a command as a proposal.
    - Reason: each name names one thing. `text` was both a schema and the terminal form, `run` both
      the handler and this method. The renames change no behaviour.
    - Holds before the first release; afterwards it would break every author's code. More renames: 30.

The next four follow the pattern of `global: false` (11): adx has a default, and the author changes
it where needed.

16. **Where `--replace` stands**:
    - Every effect takes `--replace`; `replace: false` switches it off, and `schema` then does not list it.
    - If such a command still writes over an existing file, adx's hint is "pick another name", never
      "add --replace".
17. **File modes**:
    - Default `0600` for files and `0700` for folders; a replaced file keeps its mode.
    - `files.write(file, data, { mode: 0o644 })` deviates.
18. **Location**:
    - `envDir('TRACKER_HOME')` derives `~/.tracker` from the tool's name; a second argument sets a
      location of its own. No XDG helper.
19. **Changes on replace**:
    - adx computes `changes` (JSON paths, else lines, at most 20 per list); `plan` may return its own
      `changes`.
20. **Two writers at once: deferred**:
    - Decided to build later, as TODO #12 in honeyglass/skills/TODO.md (area adx, after #8).
    - Its basis: `concurrency.md` and the prototype in `adx-write/` beside it. The recommendation
      there: a short kernel lock per root around the check and the rename only, a SHA-256 check against
      the state of `plan` (`CHANGED_SINCE_PLAN`, kind retry), `files.update(file, limit, old => next)`
      computed again under the lock, several files all or nothing with a journal.
    - When built, a fresh Fable subagent (high) reviews it, given `concurrency.md` and the prototype only.
21. **A format number in every stored file**:
    - The number counts the format of one kind of stored data, not the release of the tool. The author
      declares it next to the schema and raises it by hand, only when the stored fields change:
      `stored('friend', 2, FriendV2).from(1, FriendV1, old => ...)`. It never goes down and is never
      given twice; a beta that changes the fields takes the next number too.
    - adx writes `"version": N` into every file of that kind and reads it back. A file without the field
      is format 1. A read converts an older file in memory only; the next real write stores the new format.
    - A file of a newer format is refused (`NEWER_VERSION`, kind ask), a file that fails its schema too
      (`STORED_INVALID`, kind ask); adx never guesses.
    - Each kind of data has its own number, so a change to `template` leaves `friend` files untouched.
      `tool schema` shows the number each kind is written in.
    - The test kit keeps a checked-in fingerprint of every stored schema per number. When a schema
      changes and its number does not, the test fails: "friend: the schema changed, but its version is
      still 2. Raise it to 3 and add .from(2, ...) for the old files."
    - Models: gh (`version` in config.yml, with migrations), kubectl (`apiVersion`), git
      (`repositoryformatversion`).
22. **adx stores no secrets**:
    - A tool reads a token from an environment variable it declares, such as `bearer('TRACKER_TOKEN')`.
    - `schema` names the variable, never its value. A missing variable is a refusal of kind ask.
    - No keychain and no `login` command in adx; files in a root are `0600` anyway (17).

The next twelve answer the questions of `review-final.md` (2026-11-21).

23. **Deleting a file comes later** (question 1 of review-final.md, answer B): `files.remove` is not in
    v2. The guide names the gap under "Known limits".
24. **The real run answers the plan plus `apply`** (question 2, answer A): the real run answers
    `{ ...planned, ...applied }`, everything the dry run answered plus what `apply` returns. The dry run
    and the real run have the same fields (rule 5).
25. **Files only in `plan`, sends only in `apply`** (question 3, answer A): `act.write` and `act.update`
    leave v2, so no refusal comes after a send. A tool that needs it later gets a design of its own.
26. **Rule 16 for `read`** (question 4, answer A): an optional `output` schema on `read` turns on
    `--fields`. The test kit fails when a `read` answers a long list or a large document without `output`.
27. **The refusal for missing fields** (question 5, answer A; changes the answer shape of 14): issues
    only, in the one error shape of design.md: one issue `MISSING_VALUE` per missing field, with `path`,
    `hint` and `command` (the command that lists the field's values). No `needs` and no `next` in this
    refusal; `next` belongs to a success. `needs('project', 'team')` in the code stays.
28. **No switch for `--home`** (question 6, answer C; changes 13): `option: false` goes. Every data
    folder can be moved with `--home`, and `next` always carries it. Reason: the switch protects
    nothing (an agent can set the variable just as well), and a name clash is solved by renaming the option.
29. **The form of `files.update`** (question 7, answer A): `files.update(file, limit, old => next)`.
    adx reads the file itself, with the limit, and calls the function. With the later lock (20) adx
    calls it again under the lock with the current content, and the API does not change. Until then a
    parallel change can still be lost.
30. **More renames before the first release** (question 8):
    - `Friend.text(value)` becomes `Friend.stringify(value)`; `text` would otherwise mean three things.
    - `listedBy(list)` becomes `keyOf(list)`, and `oneOf(list)` becomes `detailOf(list)`.
    - The type names `File`, `Request` and `Issue` stay. In the tracker example, its own schema is
      named `Ticket`.
31. **The command of the `ALREADY_EXISTS` refusal** (question 9, answer A): the call with
    `--replace --dry-run`, so the agent sees in `changes` what would be lost and can ask the person
    before it replaces. For later: the package's README.md, the skill for building with adx and an
    `llms.txt` (https://llmstxt.org/) explain this flow for agents.
32. **`ROOT_NOT_FOUND` stays `ask`** (question 10, answer A), also after a wrong `--home`: one code, one
    kind, the safe side.
33. **A refusal without a field** (question 11, answer A): a new `code.issue(message?)` for a refusal
    that concerns no field; it has no `path`. `.at(field)` still always requires a field.
34. **adx builds in 15 rules, not 16**: rule 6, the agent skill, is the author's; adx only checks that a
    named skill file exists and has a frontmatter (7). The cheat sheet and the guide say so.

The next eight settle what the docs had to interpret, and the `get` proposal (2026-11-21; the owner
confirmed each recommendation).

35. **The default folder may be missing.** A folder named by `--home` or the variable must exist
    (`ROOT_NOT_FOUND`, 32). The default folder, such as `~/.hello`, may be missing; the first real write
    creates it (modes: 17). A read and a dry run create nothing.
36. **The form of the skill path.** A plain string, relative to the folder of the tool's `package.json`:
    `skill: 'SKILL.md'`. The start answer shows the absolute path, or `null` without a skill.
37. **Stored kinds register in the tool.** `tool({ stored: [Friend] })`. The test kit writes the
    fingerprint of each stored schema (21) into a file next to `package.json` on its first run; after
    that it only compares.
38. **`files.update` on a missing file** is refused with `FILE_NOT_FOUND`, kind fix.
39. **`--replace` when nothing is replaced.** A write to a new name with `--replace` passes. An effect
    whose plan writes no file at all refuses `--replace`.
40. **The shape of `changes`** (19): `{ added, changed, removed, more }`. For JSON these are paths; for
    text, the lines added and removed. `more` counts what the cap of 20 per list left out.
41. **Retries in `api`** (6): a read is tried again up to 3 times, with a growing pause, on a network
    error, 429 or 503. A send is never tried again on its own; the agent gets kind retry.
42. **`find` folds into `get`.** REST is the model: `api.get(path, schema, { on: { 404: undefined } })`
    answers `T | undefined`; `query` moves into the options, and `on` maps any other status as well,
    such as a 409.

The next twenty confirm what the docs had to interpret after decisions 1 to 42 (2026-11-21; the
owner confirmed each recommendation, and the docs already show it).

43. **The tracker example says "ticket" throughout**: the schema `Ticket` and the commands `ticket list`,
    `ticket show`, `ticket create`, `ticket schedule`, the code `TICKET_NOT_FOUND`; "issue" means only
    the refusal item.
44. **A missing field whose own list needs another missing field**: its `MISSING_VALUE` issue has no
    `command`, and its hint names the field to give first, so adx never names a command that is refused.
45. **`Friend.parse(text)`** beside `Friend.stringify(value)`: the function form of `files.update` hands
    over the old text, and a stored kind reads it with `parse`.
46. **`files.update` answers a promise, `files.write` does not**, since adx has to read the file first.
47. **`--replace` with nothing to replace** (39): refused with `UNKNOWN_OPTION` when the plan stages no
    `files.write`, also when it stages only `files.update`.
48. **`more` in `changes`** is always there, `0` when nothing was left out.
49. **`.at(field)` without a message** uses the hint of its code as the message.
50. **`failed(state, cause)`** takes kind and code from the cause, as for every unmapped error.
51. **Field to option**: kebab case; a boolean is a switch without a value, and `false` goes through
    `--json` only; a field named like one of adx's options or like a root is a `DECLARATION` error.
52. **What a derived command carries**: the fields of the call that the named command has under the same
    name (so the list call reads `hello greet --name Ada --lang`). A step the author wrote carries only
    its own fields, plus the global fields and the data folder.
53. **A `mode` given to `files.write`** holds on a replace too.
54. **The terminal form of a refusal**, as the quickstart shows it, stands as designed.
55. **The fingerprint file** (37) is named `adx.stored.json`.
56. **"A long list or a large document"** (26): more than 50 entries in an array, or more than 8 KiB of
    answer, in any probe of the test kit.
57. **`output` on `read`** also lets `schema` show the answer's fields; with no field named, the read
    still answers everything.
58. **`on` is for `get` only for now**; on `act.send` it comes later and stands under "Known limits".
59. **`apply` returns an object**, by type, since adx merges it into the plan (24).
60. **The report line for a skill** is "none named" without one and "named" with one that passes the
    check; never "met".
61. **`needs` keeps both uses** (what a source returns, and a method of a step); no rename.
62. **The guide keeps its three use cases** (`tracker`, `lintkit`, `notes`) in full.

## Clarifications

- **`--dry-run` is a core function.** adx gives it to every `effect`, for every combination of
  arguments, without code from the author, and it cannot be switched off. `read` and `list` refuse it
  as an unknown option.
- **oriko's size, counted.** At oriko 630c0b5, the parts of `cli/`, `core/` and `bin/oriko.ts` that know
  nothing of CVs have about 1,450 lines (about 950 without blank and comment lines), and about 600
  lines of tests; two counts agreed. The guide's core idea uses these numbers.

## Background

- `datadir-research.md`: how aws, kubectl, docker, gh, gcloud, npm and git keep their data folder,
  with sources. Decisions 12, 13 and 16 to 22 build on it.
- `concurrency.md` and `adx-write/`: parallel writes, the basis of 20.
