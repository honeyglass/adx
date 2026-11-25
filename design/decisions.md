# adx v2: decisions of the owner

The owner's decisions on the v2 API, in the order they were made (2026-11-20 to 2026-11-23).
They override every other file in this folder. Each decision reads on its own; where a later one
changes an earlier one, both say so.

## Made

1. **TypeScript with Zod.** Field references are keys of the inferred type.
2. **No CLI framework; argv through `util.parseArgs`** (strict: false, tokens: true). adx checks the
   tokens itself: an option followed by another option counts as given without a value, an unknown
   option is collected and reading goes on, all mistakes of a call come back in one answer.
   Routing and help come from adx's own command table.
3. **`unbash` in the test kit** (a dependency of adx, 84) splits every command a tool names in `next` or in a hint into shell
   words, and the kit checks that adx knows each call. That holds for the command of a `hint` (73)
   too. One whole call in the process of the test: 74.
4. **The agent skill is not part of the toolkit.** adx never reads, embeds or prints a skill.
5. **No `guide` or `help` text in the tool.** The first steps come from `next` in the start answer
   (rule 14, `hello.start(...)`; since 65 the property `start` of the tool) and from hints in
   refusals; care that is no step belongs in the skill. What the start answer holds, and that a
   tool adds no data to it: 72.
6. **RxJS under the hood of `api`** (a dependency of adx, 83). Retries, timeouts and cancelling several requests run on RxJS
   inside adx; the author never sees it. `api` stays its own thing rather than plain `fetch`: it checks
   every answer against a schema, maps a status to a kind, sends only through `act.send` in `apply`
   (so a dry run cannot send), and lets the test kit fake the server.
7. **`skill` is optional, a path** (since 82 a name). Without it there is no skill and nothing is checked. With it, the
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
      `plan`, so also in a dry run. A derived file is replaced without the flag since 70. Since 81
      a write of the same bytes writes nothing and needs no flag.
    - `fresh` refuses nothing any more. It only lists the taken names when `--name` comes without
      a value (rule 13).
    - `files.put` is renamed `files.write`, since "put" sounds like HTTP.
    - `--replace` is not one of the 16 rules. It implements design.md's "A command that replaces
      stored data needs a flag"; the name `--replace` is adx's choice.
11. **`global` holds for every command, and one command can deviate** (its form changed by 64):
    - `tool({ global: { input } })` gives every command the option, such as `--project`. Since 64
      the input is declared with `global({ input })`, and the tool takes that value.
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
      In a command that says `replace: 'always'` it replaces without it (70). When the file holds
      the same bytes, adx writes nothing and refuses nothing (81).
    - `files.update`: for commands whose purpose is to change (edit, update, append). No `--replace`.
      If the file is missing, adx refuses; `update` never creates anything silently. Its form: 29.
      A change that answers the text the file holds writes nothing (81).
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
14. **A source names every field that is surely missing** (its answer shape changed by 27, where
    a typo is reported by 68):
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
      lines without a "Did you mean". Since 68 the examples type a named source with `Source`, and the
      error stands at the source.
15. **Two renames**:
    - `text()` becomes `multiline()`: the schema for text with line breaks.
    - `.run(step)` on an issue becomes `.command(step)`: it attaches a command as a proposal.
      A command of another folder is attached at the tool, with `hint` (73).
    - Reason: each name names one thing. `text` was both a schema and the terminal form, `run` both
      the handler and this method. The renames change no behaviour.
    - Holds before the first release; afterwards it would break every author's code. More renames: 30.

The next four follow the pattern of `global: false` (11): adx has a default, and the author changes
it where needed.

16. **Where `--replace` stands**:
    - Every effect takes `--replace`; `replace: false` switches it off, and `schema` then does not list it.
    - If such a command still writes over an existing file, adx's hint is "pick another name", never
      "add --replace".
    - Since 70 `replace` takes a second value, `'always'`, for a command that writes a derived file.
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
    that concerns no field; it has no `path`. `.at(field)` still always requires a field. Since 69
    it also takes a path below a field, as a list that starts with the field.
34. **adx builds in 15 rules, not 16**: rule 6, the agent skill, is the author's; adx only checks that a
    named skill file exists and has a frontmatter (7). The cheat sheet and the guide say so.

The next eight settle what the docs had to interpret, and the `get` proposal (2026-11-21; the owner
confirmed each recommendation).

35. **The default folder may be missing.** A folder named by `--home` or the variable must exist
    (`ROOT_NOT_FOUND`, 32). The default folder, such as `~/.hello`, may be missing; the first real write
    creates it (modes: 17). A read and a dry run create nothing.
36. **The form of the skill path** (replaced by 82). A plain string, relative to the folder of the tool's `package.json`:
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
    Since 71 four of the names are reserved only where the command has the option, and the type
    checker reports a clash.
52. **What a derived command carries**: the fields of the call that the named command has under the same
    name (so the list call reads `hello greet --name Ada --lang`). A step the author wrote carries only
    its own fields, plus the global fields and the data folder. Since 79 it also carries the fields
    of a refused call that it names with `.carry`, and it names the list call of a field itself,
    with `.lists`.
53. **A `mode` given to `files.write`** holds on a replace too. Since 81 a write that meets the
    same bytes writes nothing and sets no mode.
54. **The terminal form of a refusal**, as the quickstart shows it, stands as designed.
55. **The fingerprint file** (37) is named `adx.stored.json`.
56. **"A long list or a large document"** (26): more than 50 entries in an array, or more than 8 KiB of
    answer, in any probe of the test kit.
57. **`output` on `read`** also lets `schema` show the answer's fields; with no field named, the read
    still answers everything. `schema` also prints the shapes a tool registers (72).
58. **`on` is for `get` only for now**; on `act.send` it comes later and stands under "Known limits".
59. **`apply` returns an object**, by type, since adx merges it into the plan (24).
60. **The report line for a skill** is "none named" without one and "named" with one that passes the
    check; never "met".
61. **`needs` keeps both uses** (what a source returns, and a method of a step); no rename.
62. **The guide keeps its three use cases** (`tracker`, `lintkit`, `notes`) in full.

The next six change the form of a tool (2026-11-22). The rules of 1 to 62 stay; where one of the six
changes how an earlier decision is written, both say so.

63. **A command is a value, and the tool lists its commands**:
    - `read({...})`, `list({...})` and `effect({...})` are functions of adx. Each returns a command,
      and nothing registers itself.
    - `tool({ ..., commands: {...} })` takes the command table. A key is one word of the call, and a
      nested table is a group: `ticket: { list, show }` makes `tracker ticket list` and
      `tracker ticket show`. A group called alone lists its actions.
    - A command has no `name` of its own. The tool that lists it sets `name`, such as `ticket list`.
    - `tool()` returns the tool with `main()`. It has no `read`, `list` or `effect` any more, so the
      earlier decisions' `hello.read(...)` now reads `read(...)`.
    - Reasons: the order of the imports was the registration, and a module nobody imported was a
      command that silently did not exist; a tool cut into folders had to keep the tool where every
      feature could import it; and no place showed the commands of a tool at once.
    - A command and a group cannot share a word, since both are one key. The guide's `notes add` and
      `notes add indexed` become `add` and `add-indexed`.
    - Three facts adx checks at startup, each a `DECLARATION` error: a key is one word of letters,
      digits and `-`; a command stands in one tool, at one place; and a command that a step, `keyOf`
      or `detailOf` names stands in the table.
    - Type-checked in `proto/hello.ts` (the commands written inside the table) and in every other
      file of `proto/` (the commands as constants above it).
64. **`global({...})` declares the global input, and hands out the three kinds typed with it**
    (changes the form of 11; its rules stay):
    - `const project = global({ input, example, values })`. `project.read`, `project.list` and
      `project.effect` are the three kinds with the global fields typed into every handler, and the
      tool takes the same value: `tool({ global: project })`.
    - Reason: with 63 a command is made before the tool, and it must know the type of the global
      input without importing the tool.
    - A tool without global input takes `read`, `list` and `effect` from adx itself.
    - `global: false` and `global: { project: 'optional' }` at a command stay as 11 says.
    - Type-checked in `proto/global.ts`: a command made without the global input does not compile in
      the table of a tool that has one, and a command made for a global input does not compile in a
      tool without it.
65. **`start` is a property of the tool** (changes 5): `tool({ start: () => [list.step()] })`. It was a
    call after the commands, because a command came from the tool, so the tool could not name it in
    its own declaration (TS7022). With 63 the commands exist before the tool.
66. **adx presupposes no folder layout.** adx reads no folder name, no file name and no order of
    imports; the table takes values, wherever they come from. A tool in one file works, and so does a
    tool cut by feature, with `bin/` for the entry, `cli/` for the tool and its table, one folder per
    feature and `core/` for what features share, as the guide's `tracker` shows. An import rule
    between such folders is the tool's own; adx neither knows nor checks it.
67. **A `next` across folders stands at the tool, with `after(command, steps)`** (since 80 `after`
    also takes a list of commands):
    - A `next` whose steps stay in the command's own folder stands at the command, as before.
    - A step to a command of another folder stands where the tool is put together:
      `tool({ next: [after(whoami, () => [tickets.step()])] })`. So a feature folder imports only
      what features share and itself, with no exception; oriko keeps such steps in `cli/next.ts` for
      the same reason.
    - `after` gets what `next` gets: the answer of the real run, and the input. Like `next`, it runs
      only after a success, and never on a dry run.
    - Its steps follow the steps of the command's own `next`. Several entries for one command hold
      in the order of the list.
    - An `after` for a command the tool does not list is a `DECLARATION` error.
    - Not covered: the `look` of an effect stands in the handler, so it names a command of its own
      folder only. The guide names the gap under "Known limits". The command in an issue
      (`.command(step)`) was not covered either; since 73 it has `hint(code, step)` at the tool.
    - Type-checked in `proto/tracker/tests/types.ts`: a typo in the answer does not compile, and
      neither does a global field the command does not take.
68. **How the examples place schemas and sources** (changes where 14 reports a typo):
    - A schema that one command reads stands in that command. A schema that several commands read
      gets a name; in a tool cut by feature it lies in the feature, in a file such as
      `ticket.schema.ts`, or in `core/` when several features read it.
    - A source written in `values` gets its fields from the command. A source with a name is typed
      with adx's `Source`, such as `Source<{ project: string; team: string }>`. No example writes a
      type of its own for the fields a source reads.
    - With both, a typo in `needs` is reported at the source, not at the `values` line that uses it.
      Type-checked in `proto/needs.ts`.

The next six come from the analysis of oriko's move onto adx (2026-11-23; the owner chose answer A
for each). Where one changes an earlier decision, both say so.

69. **An issue can stand below a field: `.at` takes a path as a list** (changes 33):
    - `.at(['blocks', 'nobody'], message)` names a place below a field. The first part is a field
      of the input. Each further part is a key, as a string, or an index, as a number.
    - The flat form stays valid: `.at('blocks')` is the issue at the field itself.
    - The type checker allows only a path that starts with a field of the command.
      `.at(['blokcs', 'nobody'])` does not compile, in `check` and in `refuse`, as `.at('blokcs')`
      does not. An empty list does not compile either.
    - The answer writes the path with dots: `"path": "blocks.nobody"`, or `"people.2.name"` with an
      index. That is the form of the JSON paths in `changes` (40), and adx's own `SCHEMA` issues
      name a part of the input the same way.
    - adx fills `command` from the source of the first part, as it does for a flat path.
    - Reason: a field given through `--json` can hold a list or an object. An issue at the field
      alone does not say which part is wrong, and the agent has to search for it.
    - Type-checked in `proto/examples/parts.ts`.
70. **A derived file is replaced without `--replace`** (changes 10, 12 and 16):
    - A derived file is one the tool builds again from what it stores, such as a built document or
      an export. A command that writes such files says `replace: 'always'`, and every `files.write`
      of that command then replaces an existing file without `--replace`.
    - Data that someone keeps stays as 10 says: an existing file is refused without `--replace`. In
      oriko these are the CVs, the profiles and the photos.
    - The command is the only place that says it. `files.write` reads it from there and takes no
      option of its own, so nothing is written twice, and `schema`, which cannot see a call inside
      `plan`, reads the same declaration: `schema <command>` shows `"replace": "always"`. Such a
      command takes no `--replace`, as with `replace: false` (16).
    - The declaration covers every file the command writes. So a command that writes a derived file
      and a kept file in one call cannot use it: it would replace the kept file without a word.
      Such a command stays behind `--replace`, or it is cut into two commands. No command of
      `proto/`, of the guide or of oriko writes both kinds in one call.
    - `files.update` is not touched by it: it never needed `--replace` (12).
    - The answer reports the replace as every write does: `replaces: true`, and `changes` (19). The
      dry run answers the same, so an agent sees it before the file is touched.
    - Reason: a build writes its output on every call. A `--replace` that every call needs is added
      without a thought, and then it no longer guards the data that someone keeps.
    - For oriko's move, a deliberate change: `photo set` will need `--replace` when a photo is
      already there.
    - Type-checked in `proto/examples/datafolder.ts`: `files.write` takes no `replaces` option, and
      `replace` takes `false` or `'always'` and no other value.
71. **A field name is reserved only where the command has adx's option** (changes 51):
    - 51 refused a field named like any option of adx, on every command. For four of the names
      that now holds only on a command that has the option from adx itself:
      - `page`: on a `list`.
      - `fields`: on a `list`, and on a `read` with `output` (26).
      - `help`: on every command, since every command takes `--help`.
      - `version`: on no command, since `--version` belongs to the tool called alone.
    - So an `effect` may name a field `page`, as oriko's `block move` does.
    - `json`, `output`, `dry-run` and `replace` stay reserved on every command, and so does the
      name of a root, such as `home`.
    - The type checker reports a clash at the declaration: the `input` of the command does not
      compile. A global input reaches every kind of command, so it takes none of the names.
    - The name of a root stays a `DECLARATION` error at startup, since a command does not know the
      roots of its tool.
    - Type-checked in `proto/hello2.ts` and `proto/global.ts`.
72. **A tool registers shapes, and `schema` prints them** (see 5 for the start answer):
    - A shape is a schema that a caller writes and no command takes whole: a part of an input, or
      a file that someone edits by hand. `tool({ shapes: { person: Person } })` registers it under
      a name.
    - `tool schema` lists the names of the shapes beside the commands, and `tool schema person`
      prints the shape as JSON Schema. The whole input of a command needs no shape:
      `tool schema <command>` prints it already.
    - A `SCHEMA` issue names the shape. When the part of the input that fails lies inside a shape,
      the `command` of the issue is `tool schema person`, else `tool schema <command>`. adx knows
      the part by the schema value: the same value stands in `shapes` and in the input. Of two
      shapes on the path, the inner one counts.
    - Every tool registers its own shapes. adx brings none.
    - A key is one word, as in `commands` (63). A shape and a command cannot share a name. Both
      are `DECLARATION` errors. A shape may share its word with a group: `tool schema profile`
      prints the shape, and `tool schema profile set` the command.
    - The start answer stays what 5, 36 and 65 make it: the name, the version, the path of the
      skill, the commands and the first steps. A tool adds no data of its own to it. Data comes
      from a command, such as a list.
    - For oriko's move, a deliberate change: its start answer loses `home`, `cvs` and `profiles`.
      `oriko cvs` and `oriko profiles` answer them.
    - Type-checked in `proto/examples/parts.ts`.
73. **A hint across folders stands at the tool, with `hint(code, step)`** (changes 67):
    - A command in an issue whose target lies in the handler's own folder stands at the issue, with
      `.command(step)`, as before (15).
    - A command of another folder stands where the tool is put together:
      `tool({ hints: [hint(noCv, () => init.step())] })`. adx adds the command to every issue of
      that code. So the import rule of a tool cut by feature holds with no exception, also for a
      code in `core/` that two features raise.
    - `hint` takes a code the tool declared with `code()`, and a function that answers one step to
      a command. A step from `tell` does not compile, since the `command` of an issue is a command.
    - The function gets nothing. So adx can call it at startup and check that the named command
      stands in the table of the tool. A command that does not, and a second hint for one code,
      are `DECLARATION` errors.
    - The step carries what a step the author wrote carries (52): its own fields, the global
      fields of the call and the data folder. Since 79 it also takes fields of the refused call,
      with `.carry`, and lists the values of a field, with `.lists`.
    - Three places can name the command of an issue. The `.command(step)` at the issue wins, then
      the hint of the tool, then the command adx derives from the source of the field.
    - Still not covered: the `look` of an effect stands in the handler and names a command of its
      own folder.
    - Type-checked in `proto/ship/cli/hints.ts` and `proto/tracker/tests/types.ts`.
74. **The test kit runs one whole call in the process of the test, with `run`** (see 3):
    - `run(tool, argv, options)` from `@honeyglass/adx/test` runs one call as the program would:
      `run(hello, ['greet', '--name', 'Ada'], { tty: true, seed })`. It goes from the arguments
      through the routing and the handler to the written answer and the exit code.
    - It answers `{ exit, out, err }`: the exit code, and what the call wrote to stdout and to
      stderr.
    - The options are the samples of `conformance` (`env`, `fakes`, `seed`) and the three things a
      call gets from its surroundings:
      - `cwd`: the working directory. Without it, a fresh scratch folder.
      - `stdin`: the text the call reads, or `null` when nothing is piped in. The default is `null`.
      - `tty`: whether stdout is a terminal. `true` answers text, `false` JSON. The default is
        `false`.
    - The data folder is a fresh scratch folder with the seed copied in, as for every probe.
    - `invoke` stays for one command with typed input and no arguments. `run` is for what only a
      whole call shows: the text form, input through stdin, a group called alone, the exit code.
    - `run` does not replace a test of the real program. `conformance` with a command line stays,
      and so does a tool's own test over the real process, such as oriko's golden file.
    - Reason: a call in the same process starts no program, so a tool can test many calls, and the
      test can fake the server and seed the data folder.
    - Type-checked in `proto/examples/hello.test.ts` and `proto/ship/tests/ship.test.ts`.
75. **A tool gets adx from GitHub, and names `@honeyglass/utils` itself:**
    - A tool names adx in its `package.json` as `"github:honeyglass/adx#<full sha>"`, the same way
      as `@honeyglass/utils`. adx keeps its built `dist/` in the repository, so the install runs no
      build step.
    - adx names `@honeyglass/utils` twice, both with the full 40-character sha: as a
      `peerDependency`, for the tools that use adx, and as a `devDependency`, for its own tests and
      build.
    - zod is, like `@honeyglass/utils`, a `peerDependency` and a `devDependency` of adx. Reason:
      `dist/` imports zod at its run, and the tool and adx then use the same zod (2026-11-23, during
      the build).
    - A tool that uses adx names adx and `@honeyglass/utils` directly in its `package.json`.
    - The tool's `pnpm-workspace.yaml` sets `autoInstallPeers: false` and
      `strictPeerDependencies: true`. A tool that names only adx then stops at the install with
      `ERR_PNPM_PEER_DEP_ISSUES`, "missing peer @honeyglass/utils".
    - adx also checks at its start that `@honeyglass/utils` is there, and answers a refusal of kind
      `ask` that names the line to add, instead of Node's error for a missing module.
    - Reason: `blockExoticSubdeps` lets a git dependency stand only directly in a `package.json`. A
      `dependency` of adx on utils fails the install with `ERR_PNPM_EXOTIC_SUBDEP`, even when the
      tool names utils itself. A `peerDependency` is resolved from the tool's own direct one.
    - Reason for the two settings: with `autoInstallPeers` on, its default, pnpm fetches a missing
      peer from GitHub without a word and so goes around `blockExoticSubdeps`. Every repository
      closes that on its own, not only the tools that use adx.
    - Measured on 2026-11-23 with pnpm 12.9.0 and oriko's `pnpm-workspace.yaml`, with
      `honeyglass/actions` and a test package in place of adx.
76. **adx catches every expected error inside, and a bug once, in `main()`** (see 6, 41, 50
    and 75):
    - The code of adx, of `proto/oriko` and of oriko follows the owner's coding rules in
      `~/.claude/rules`, above all `errors.md` and `ecmascript/try-catch.md`.
    - adx handles every expected error inside itself, so an author writes no `try`: with `$try`
      for a promise, and with `trySync$` for a synchronous call that can throw. Both come from
      `@honeyglass/utils`, as `RefusalError` does (75).
    - The places:
      - `api.get`, `api.post` and the other methods of a remote: the network, the status and the
        JSON of the answer (6, 41).
      - `files.update`: reading the file (29, 38).
      - The writing after `plan`: the folder, the lock (20) and the rename.
      - The raw JSON input from `--json` or from stdin (9).
    - At each place adx takes the raw error where it starts and answers with its own refusal:
      one of adx's codes, its kind, the `state`, and the raw error whole as `cause`. Which error
      gets which code and kind is not decided here: the guide lists it under "Errors you did not
      map", and 41 says what is tried again.
    - A bug, such as one in a handler of oriko, is not caught below. No `$try` of adx stands
      around a handler, so a programming error flies on.
    - `main()` is the outermost function. It catches once, with one `$try` around its whole body.
      A refusal that reaches it is answered by its kind. Any other error is a bug: adx answers
      `UNKNOWN_ERROR`, kind `bug`, with exit code 2 (rule 10), in the one error shape (27).
    - What that means for an author: a handler writes no `try` for anything that goes through
      adx. Where its own code can fail in an expected way, such as a file it reads itself or the
      status of a send it expects, it takes the error with `$try` or `trySync$`, checks it on the
      next line, and answers with `refuse(...)` or throws `failed(state, error)` (50). It writes
      no native `try` and no `.catch`. An error it did not expect it throws on.
    - Type-checked in `proto/tracker/tickets/close.ts`, `proto/oriko/read/sources.ts` and
      `proto/oriko/classic/images.ts`. No file of `proto/` holds a native `try`.

The next five settle five points that did not fit when oriko was written on adx (2026-11-23).
`proto/oriko/README.md` listed them under "What does not fit yet". Where one changes an earlier
decision, both say so.

77. **A step can lead to adx's own `schema` command, with `schema.step(name)`** (see 63 and 72):
    - adx exports `schema`. `schema.step('person')` is a step to the call `tool schema person`.
    - The name is what `schema` takes after its own word: a shape of the tool's `shapes`, or a
      command by its words, such as `profile set`. Where a shape and a group share a word, the
      name means the shape, as in 72.
    - The step is a `Step`. So it stands wherever a step stands, such as in `next`, in `after`, in
      `start` and in `.command(step)` at an issue.
    - adx checks at startup that `schema` knows the name. A name it does not know is a
      `DECLARATION` error, as a step to a command the tool does not list is (63). So a typo is an
      error at startup, not a text in an answer that no call fits.
    - Reason: a step came from a command value only, and `schema` is adx's own command, so no tool
      has a value for it. A tool could not name the call that shows what the agent writes next.
    - Use case, oriko: after a posting was read, the agent writes a profile. So `read` answers
      `oriko schema profile` before `oriko profile set`, and `profiles` answers it when no profile
      is stored. After an old CV was read, `read` answers `oriko schema init` after `oriko init`.
      These steps were left out of `proto/oriko/cli/next.ts` and now stand there.
    - Type-checked in `proto/examples/check.ts` and `proto/oriko/cli/next.ts`.
78. **A handler checks a part against a schema with `check`, and the issues are `SCHEMA`** (see 69
    and 72):
    - adx exports `check(shape, value, path)`. It checks the value against the shape and answers
      `{ data, issues }`: the checked value with `issues: null`, or `data: null` with one issue
      per problem, at least one. An optional fourth argument is `{ as: shape }`.
    - Every issue has the code `SCHEMA`, as the issues of adx's own check of the input have.
    - The path is a list as in 69: a field of the command first, then a key or an index per
      level. An issue stands at that path, plus the place inside the part:
      `check(Colleague, about, ['about'])` answers an issue at `about.team`.
    - When the shape stands in the tool's `shapes`, the `command` of every issue is
      `tool schema <name>`. adx finds the shape by identity: the same value stands in `shapes` and
      in the call of `check`, as in 72. Else the `command` is `tool schema <command>`, the schema
      of the command that runs.
    - With `{ as: shape }`, the issues name the schema command of that shape in place of the
      checked one: `check(ITEM[kind], value, ['value'], { as: Item })` checks against `ITEM[kind]`
      and answers `tool schema item`. adx finds the shape of `as` in `shapes` by identity, as it
      finds the checked shape without it. `as` changes the `command` only, never what is checked.
    - `as` is for a checked shape that stands in no `shapes`, such as the shape one kind takes,
      where a registered shape shows the caller all of them.
    - `check` refuses nothing itself. The handler reports the issues with `refuse(...issues)`.
      Issues of several checks, and issues of the tool's own codes, go into one `refuse(...)`, so
      one answer names them all (rule 7).
    - `refuse` takes only an issue at a field of its command (69), so a path that starts with
      another word does not compile there.
    - Reason: adx checks the input before the handler runs. A part whose shape depends on stored
      data says `unknown` in the schema of the input, and only the handler can check it. adx owns
      the code `SCHEMA`, so the handler had to answer a code of its own, with a hint that names
      the shapes by hand.
    - Use case, oriko: the kind of a stored block picks the shape of an item, of the fields
      `block update` sets and of a patch in a profile. `edit/apply.ts` and `profile/set.ts` check
      these parts with `check`, and oriko's own code `WRONG_SHAPE` goes. The shapes by kind stand
      in no `shapes`, so the check of an item says `{ as: Item }` and the check of a patch
      `{ as: Block }`. The issues name `oriko schema item` and `oriko schema block`, as oriko
      does today.
    - Type-checked in `proto/examples/check.ts`, `proto/oriko/edit/apply.ts` and
      `proto/oriko/profile/set.ts`.
79. **A step takes fields of the refused call, with `.carry(...fields)`, and lists the values of
    a field, with `.lists(field)`** (changes 52 and 73):
    - `CommandStep` gets `.carry(...fields)`. It takes fields of the target command only:
      `show.step().carry('cv')` compiles, and `show.step().carry('cvs')` does not.
    - It is for a step that is the command of an issue, above all in a `hint`, whose function
      gets nothing (73).
    - The principle: `.carry` takes a value only when the target command would accept it in a
      real call. When adx cannot check that, the value stays out.
    - When adx answers the refusal, it takes the value of the field of the same name from the
      refused call. It takes the value only when it passes the schema of the target command.
    - Where the field has a source in the target command, adx also checks the value against
      that source. A value outside the list stays out of the step.
    - Where that source is `fresh(...)`, a name that is already taken stays out: the target
      command would refuse it without `--replace`. A free name that passes the schema is taken
      over.
    - A source that answers `needs(...)` cannot list its values yet. adx cannot check the value
      then, so it stays out.
    - adx blocks every remote while it answers a refusal. When a source calls one in that time,
      no request goes out, and the value stays out of the step. Nothing has to be declared for
      that. A source that calls no remote, such as one that reads the data folder, runs as
      always. So a refusal never sends a request.
    - Otherwise the field stays out of the command: when the refused call has no field of that
      name, when the call did not give it, and when its value fails the schema of the target. A
      required field is then open, and adx derives `needs` from it as for every step.
    - The function of a `hint` still gets nothing, so adx still calls it at startup (73).
      `.carry` names the fields there, and their values come with each refusal.
    - `CommandStep` also gets `.lists(field)`. The step then names the option of that field
      without a value, so the call lists the values the field takes (rule 13):
      `show.step().lists('block')` is the call `tool show --block`.
    - `.lists` compiles only for a field of the target command that has a source in `values`.
      `show.step().lists('block')` compiles, since `show` names a source for `block`. A field
      without a source does not compile, and neither does a word that is no field.
    - The source stands in the `values` of the command itself. A global field whose source
      stands in `global({ values })` cannot be listed with `.lists`, since no tool needs it yet.
    - A field the step lists does not stand in its `needs`, also when it is required: the step
      lists the values, and the agent picks one.
    - A step that gives a field a value cannot also list it:
      `show.step({ block: 'x' }).lists('block')` does not compile.
    - `.needs(field)` and `.lists(field)` for the same field on one step do not compile, in
      either order: `show.step().needs('block').lists('block')` does not, and neither does
      `show.step().lists('block').needs('block')`.
    - Reason: the command that helps often needs to know what the refused call worked on. A hint
      without it names a command the agent has to complete itself. And the command that helps is
      often the list of one field's values. adx derives that call for a field with a source (52),
      and a step the author wrote could not name it.
    - Use case, oriko: `UNKNOWN_BLOCK` lies in `core/`, and the edits, `profile set` and `plan`
      raise it. The command that helps lists the blocks of the CV the call worked on. `--block`
      of `show` has a source that reads the block ids of the CV that `--cv` or `--profile` names.
      The hint is `hint(unknownBlock, () => show.step().carry('cv', 'profile').lists('block'))`.
      After a call with `--cv jane` it answers `oriko show --cv jane --block`, as oriko does
      today. `oriko plan --profile broken` answers `oriko show --profile broken --block`.
      `oriko profile set --profile initech` with the CV jane answers
      `oriko show --cv jane --block`: `initech` is a new name, so the source of `--profile` in
      `show` does not list it, and it stays out.
    - Type-checked in `proto/oriko/cli/hints.ts` and `proto/oriko/tests/types.ts`.
80. **`after` takes one command or a list of commands** (changes 67):
    - `after([create, close], steps)` gives the same steps to every command of the list. It is
      the same as one `after` per command.
    - The list is not empty: `after([], steps)` does not compile.
    - The function must fit every command of the list. It gets an answer and an input that may
      come from any of them, so it reads only what all of them have. A function that reads a field
      one command lacks does not compile.
    - What 67 says holds for each command of the list: the steps follow the command's own `next`,
      and a command the tool does not list is a `DECLARATION` error.
    - Reason: `after` typed one command. The same step after several commands was one line per
      command, and a new command of the group was easy to leave out.
    - Use case, oriko: each of the 13 edits answers `preview` and `build` when the CV still fits
      its pages. The 13 lines of `cli/next.ts` become one `after([...], fitted)`.
    - Type-checked in `proto/oriko/cli/next.ts` and `proto/oriko/tests/types.ts`.
81. **A `files.write` of the same bytes writes nothing, and neither does a `files.update` that
    answers the same text** (changes 10, 12 and 53):
    - When the file exists and holds the same bytes as the write, adx writes nothing, and the
      call needs no `--replace`: nothing can be lost.
    - `Written` then answers `replaces: false` and `unchanged: true`, and no `changes`. The field
      `unchanged` stands in the answer only then.
    - `plan` and a dry run show the same, as for every write (10).
    - Other bytes stay as 10 says: refused with `ALREADY_EXISTS` without `--replace`, and replaced
      with it, or in a command that says `replace: 'always'` (70).
    - A call with `--replace` passes too: its plan stages a `files.write`, so the option is known
      (47).
    - `files.update` follows the same rule. When its function answers the text the file already
      holds, adx writes nothing. `Written` answers `replaces: false` and `unchanged: true`, and
      no `changes`, and `plan` and a dry run show the same. `files.update` still takes no
      `--replace` (12), and a missing file stays `FILE_NOT_FOUND` (38).
    - A real run that writes nothing answers `applied: true`, because the files are in the
      wanted state afterwards. `unchanged` stands per file, and `applied` for the whole call.
    - When nothing is written, no mode is set either. A `files.write` with a `mode` (17, 53) that
      meets the same bytes leaves the file the mode it has, also when the two differ.
    - Reason: an agent sends a call twice, after a timeout or when it does not know whether the
      first call went through. The second call changes nothing. A refusal there asks for a
      `--replace` that guards nothing, and the agent learns to add it without a thought (see 70).
    - Use case, oriko: `profile set` with the profile that is already stored answers ok and
      writes nothing.
    - Type-checked in `proto/oriko/tests/oriko.test.ts`.

The next three settle points the build of adx left open (the person, 2026-11-24).

82. **A tool names its skill by name, and the skill lies where Claude Code looks for it**
    (changes 7 and 36):
    - `skill` in `tool()` takes the name of the skill, such as `skill: 'oriko'`, not a path.
    - The skill lies at the standard place of Claude Code, `~/.claude/skills/<name>/SKILL.md`.
      The tool's own install puts it there: oriko's `install.sh` links it.
    - The start answer shows the name, or `null` without a skill.
    - adx no longer looks for the tool's `package.json` because of the skill. The fingerprint
      file of 37 still lies next to `package.json`.
    - The test kit's check "agent skill" checks the skill by its name: the file exists and starts
      with a frontmatter that has `name` and `description`, as 7 says.
    - The skill stays optional: without `skill` the check is skipped. With `skill`, the test names
      the repository's SKILL.md by a path in `samples`, relative to the test's working folder.
      The kit copies that file into a scratch home at `.claude/skills/<name>/SKILL.md`, and adx
      looks for the skill there with that scratch folder as the home. So the test checks the
      repository's current file, runs in CI, and covers the real lookup path.
    - Reason: Claude Code finds a skill at its standard place, not next to the tool. A path
      relative to `package.json` made adx find that folder at run time, which no rule settled.
83. **RxJS is a dependency of adx** (confirms 6):
    - Retries, timeouts and the cancelling of requests run on RxJS, inside adx; the author never
      sees it.
    - adx names the newest version that `minimumReleaseAge` lets through, at least three days old.
    - Reason: the first build used a plain loop, because its brief forbade new dependencies. That
      brief was wrong; 6 stands.
84. **`unbash` is a dependency of adx** (confirms 3):
    - The test kit splits every named command with `unbash`. It replaces adx's own splitter.
    - Reason: as for 83, the brief of the first build was wrong; 3 stands.

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
