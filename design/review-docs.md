# Review of the v2 docs against the decisions and the final review

Written on 2026-11-21, after `guide.md`, `guide.de.md`, `cheatsheet.de.md`, `vorher-nachher.de.md` and `proto/` were brought in line with decisions 1 to 42 of `decisions.md` and with the findings of `review-final.md`. Section names below are headings of `guide.md` and of `cheatsheet.de.md`.

## Result

- Every decision from 1 to 42 shows in the guide and in the cheat sheet, or is named below as not needing a place.
- Every finding M1 to M11 and S1 to S17 is fixed, or settled by a decision that is named.
- `tsc -p .` in `proto/` exits 0 (TypeScript 5.9.3, Zod 4.6.5). 37 cases must not compile, and each fails for its stated reason.
- Every `ts` block of `guide.md`, of the cheat sheet and of the "Nachher" parts stands line for line in a file of `proto/`.
- `guide.md` and `guide.de.md` have the same lines, the same code blocks and the same content.
- No old name survives outside the "Vorher" blocks.
- 20 points had to be interpreted. They are the questions at the end.

## Decisions, one by one

"Guide" names the section of `guide.md`. "Sheet" names the section of `cheatsheet.de.md`.

1. **TypeScript with Zod.** Guide: "1. What adx is" (typos that do not compile), "What just happened", FAQ on type safety. Sheet: "Wie adx gebaut ist".
2. **No CLI framework, `util.parseArgs`.** Guide: "How adx reads a call" in chapter 6. Sheet: "Wie adx gebaut ist".
3. **`unbash` in the test kit.** Guide: "Testing your tool", "Named commands". Sheet: "Tests".
4. **The skill is not part of the toolkit.** Guide: "The tool explains itself". Sheet: "Das Tool", "Wie adx gebaut ist".
5. **No guide or help text.** Guide: "The tool explains itself", "Next steps" (`hello.start`), "Calls" in chapter 6. Sheet: "Wie adx gebaut ist".
6. **RxJS inside `api`.** Guide: FAQ "Why does `api` not use plain `fetch`?", with the four reasons. Sheet: "Wie adx gebaut ist".
7. **`skill` is optional, a path.** Guide: "The tool explains itself", "Testing your tool" (the skill check), "Known limits". Sheet: "Das Tool", "Tests", rule 6.
8. **No rows for codes in the skill.** Guide: nothing asks for rows; "the kit does not read the commands, options or codes in the file". Sheet: "Tests".
9. **Options and `--json` in one call.** Guide: "A command that reads", "How adx reads a call". Sheet: "Auf der Kommandozeile".
10. **Replacing a stored file.** Guide: "A command that changes something" (the write decides, the refusal comes in `plan`, `fresh` refuses nothing). Sheet: "Dateien in `plan`", "Wertequellen". Not shown: that `--replace` is no rule of its own, which is history.
11. **`global`, and one command can deviate.** Guide: "A command without the project" in the tracker. Sheet: "Globale Eingabe". Prototype: `global.ts`.
12. **`files.write` and `files.update`.** Guide: "Changing a file with `files.update`", with the two-row table and the models. Sheet: "Dateien in `plan`", "Der Datenordner".
13. **The data folder moves by variable and option** (changed by 28). Guide: "Moving the folder". Sheet: "Der Datenordner".
14. **A source names every missing field** (answer shape changed by 27). Guide: "Labels need the project first" and "A list that needs two fields". Sheet: "Wertequellen", "Auf der Kommandozeile". Prototype: `needs.ts`.
15. **`multiline()` and `.command(step)`.** Guide: "A command that reads", "Next steps". Sheet: "Schemas von adx", "Ablehnungen".
16. **Where `--replace` stands.** Guide: last paragraph but one of "A command that changes something". Sheet: "Der Datenordner".
17. **File modes.** Guide: "Files" in chapter 6. Sheet: "Der Datenordner".
18. **Location.** Guide: "Where the folder lies". Sheet: "Ordner und Dateien".
19. **Changes on replace** (shape: 40). Guide: "Files" in chapter 6. Sheet: "Der Datenordner".
20. **Two writers: deferred.** Guide: "What is not covered yet" and "Known limits". Sheet: "Bekannte Grenzen". No lock and no `CHANGED_SINCE_PLAN` anywhere.
21. **A format number in every stored file.** Guide: "Stored data that changes its format". Sheet: "Gespeicherte Formate". Not shown: the models gh, kubectl and git.
22. **No secrets.** Guide: "No secrets". Sheet: "Der Datenordner", "Server".
23. **Deleting comes later.** Guide: "What is not covered yet", first point of "Known limits". Sheet: "Dateien in `plan`", "Bekannte Grenzen". `Files` in the prototype has no `remove`.
24. **`{ ...planned, ...applied }`.** Guide: notes below `ticket create`, "Creating a ticket", "The answer". Sheet: "Senden in `apply`", rule 5. Prototype: `apply` returns an object, `next` gets `plan & apply`, `invoke` and `text` get `plan & Partial<apply>`.
25. **Files only in `plan`, sends only in `apply`.** Guide: notes below `ticket create`. Sheet: "Dateien in `plan`", "Senden in `apply`". `Act` in the prototype has `send` only.
26. **`output` on `read`.** Guide: `ticket show`, "One ticket, cut to two fields", "Options", the fourth kit check. Sheet: "Eigenschaften einer Art", "Tests", rule 16.
27. **`MISSING_VALUE` per field.** Guide: "Labels need the project first", "A list that needs two fields", "The answer", "adx's own codes". Sheet: "Wertequellen", "Auf der Kommandozeile". `Answer` has no `needs`.
28. **No switch for `--home`.** Guide: "Moving the folder" ("it cannot be switched off"). Sheet: "Der Datenordner". `root()` takes two arguments. The second root `vault` is gone.
29. **`files.update(file, limit, old => next)`.** Guide: "Changing a file with `files.update`", `notes append`, `add indexed`, `friends learn`. Sheet: "Dateien in `plan`".
30. **Renames.** `Friend.stringify`, `keyOf`, `detailOf` and `Ticket` are used everywhere. `File`, `Request` and `Issue` stay in the prototype.
31. **The command of `ALREADY_EXISTS`.** Guide: "A command that changes something". Sheet: "Auf der Kommandozeile" (Ersetzen). Not shown: the plans for a README and an `llms.txt`.
32. **`ROOT_NOT_FOUND` stays `ask`.** Guide: "Moving the folder", with a wrong `--home`. Sheet: "Der Datenordner".
33. **`code.issue(message?)`.** Guide: "Refusing bad input with a hint" (one point), `whoami` in the tracker, "The answer". Sheet: "Ablehnungen".
34. **15 rules, not 16.** Guide: "1. What adx is", "The tool explains itself", the report line "Agent skill none named". Sheet: "Die Idee", "Tests", "Die 16 Regeln und der Teil von adx".
35. **The default folder may be missing.** Guide: "Where the folder lies", "Moving the folder". Sheet: "Der Datenordner".
36. **The form of the skill path.** Guide: "The tool explains itself". Sheet: "Das Tool", "Auf der Kommandozeile".
37. **Stored kinds register in the tool.** Guide: "Stored data that changes its format" (`stored: [Friend]`, the fingerprint file). Sheet: "Gespeicherte Formate".
38. **`FILE_NOT_FOUND`, kind fix.** Guide: "Changing a file with `files.update`". Sheet: "Dateien in `plan`".
39. **`--replace` when nothing is replaced.** Guide: "A command that changes something". Sheet: "Der Datenordner".
40. **The shape of `changes`.** Guide: "Files" in chapter 6. Sheet: "Der Datenordner", "Auf der Kommandozeile".
41. **Retries.** Guide: "A busy server", "A send is never tried again by adx", "Errors you did not map". Sheet: "Server".
42. **`find` folds into `get`.** Guide: `ticket show` and `ticket list` in the tracker. Sheet: "Server". `Remote` in the prototype has no `find`.

The clarification on `--dry-run` shows in "A command that changes something" and in "Options". The counted lines of oriko show in "1. What adx is".

## Findings, one by one

### Must fix

- **M1.** Fixed by 24. The command is now `ticket schedule`, and its `apply` returns `{ ticket }`. The type closes it: `apply` returns an object that adx merges into the plan.
- **M2.** Settled by 25. `act.write` and `act.update` are gone from the docs and from the types.
- **M3.** Settled by 23. The gap stands in "Known limits", with what a tool has to do meanwhile.
- **M4.** Settled by 26. `output` on `read`, `--fields`, and a kit check.
- **M5.** Settled by 34. The cheat sheet says 15 rules. The report prints "none named".
- **M6.** Fixed. The guide and the cheat sheet say `.needs('style')`. `hello2.ts` holds that call.
- **M7.** Fixed. `next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : [])`.
- **M8.** Fixed under 27. The refusal has issues only. The issue for `team` has no `command`, because its list needs the project too. The guide says so in one paragraph. See question 2.
- **M9.** Settled by 33. `whoami` refuses with `.issue()`. Two negative cases show that `.at()` still needs a field.
- **M10.** Fixed. "1. What adx is" says the list holds for files through `files` and requests through a remote. "Known limits" has a point of its own. The kit compares the scratch folder before and after.
- **M11.** Settled by 28. `option: false` is gone.

### Should fix

- **S1.** Settled by 27. A refusal has no `needs`, so `Answer` has none. A negative case holds `answer.needs`.
- **S2.** Fixed. Basics now runs: read, options and values, refusing, the long list, the effect, next steps. The handle is defined at the first `const greet`. `LANGUAGES` and `byCode` stand in one block. Each code has its line. `english` is gone. `FriendIn` is declared where `friends add` uses it.
- **S3.** Fixed. The first `greet` takes `z.enum(['en', 'de', 'eo'])`, with no fallback. The later `run` throws in the branch adx has ruled out.
- **S4.** Fixed in structure. One list in chapter 1. The refusal for an existing file stands once in full. Chapter 4 keeps where, moving, update and reading. Modes and `changes` moved to "Files" in chapter 6. Older files moved to Advanced. The `notes` section keeps `outFile`, `inFile`, several files and the two failure states. The guide went from 1632 to 1569 lines. See question 20.
- **S5.** Fixed. "Run it" shows the refusal at a terminal. The reference to another package is gone.
- **S6.** Fixed. Five points in "How adx reads a call": kebab case, switches, numbers, `--name=value`, taken names with `DECLARATION`. See question 9.
- **S7.** Fixed. "Commands adx names" in chapter 6 states the rule. The example now reads `hello greet --name Ada --lang`. See question 10.
- **S8.** Fixed with 39. See question 5 for the code.
- **S9.** Fixed. The layers name the lists. `.at()` without a message repeats the hint. `failed` takes its kind from the cause. See questions 7 and 8.
- **S10.** Fixed as far as 30 decides: `stringify`, `keyOf`, `detailOf`, `Ticket`, and the command is `ticket schedule`. `needs` still names two things. See question 19.
- **S11.** Fixed. A kind left out of `stored` is a `DECLARATION` error. "Known limits" names the file written around its kind. The guide shows three formats, newest first.
- **S12.** Fixed, all seven points: "does not split settings from data on its own"; the false sentence on `0600` is gone; "about ten lines" (nine counted in `needs.ts`); the limit names `.command()` too; Node 24.2; one message for `UNKNOWN_OPTION`; `applied true` and `applied false` in both runs.
- **S13.** Fixed. "The tool never opens it"; only the kit reads the frontmatter.
- **S14.** Fixed. `Needing` and its two commands are removed from the prototype.
- **S15.** Fixed. "nimmt kein `--replace`", "adx schreibt nie durch einen Link hindurch", "den Server durch einen Fake ersetzen".
- **S16.** Fixed. The third extra check in "Testing your tool".
- **S17.** Fixed. One sentence before `Known` in the tracker.

## The two guides say the same

`guide.de.md` is built from `guide.md` by a script. The script copies every code block and every blank line, and replaces each of the 361 prose lines by its German line. It checks three things per line:

- the same kind of line: heading level, list item, numbered item, table row, bold lead;
- the same inline code, as a set;
- the same numbers.

All 361 lines pass. All 121 code blocks are identical. The 5 in-page links of each guide resolve to a heading. A scan found no word with a missing umlaut. No file holds an em dash or an en dash. No table has more than three columns.

## Old names

Searched in `guide.md`, `guide.de.md` and `cheatsheet.de.md`, with no hit: `files.put`, `act.put`, `text()` as a schema, `.run(step)` on an issue, `NAME_TAKEN`, `tool skill` and `hello skill`, `act.write`, `act.update`, `option: false`, `api.find`, `listedBy`, `oneOf`, `Friend.text`, `new URL('./SKILL.md'`, a `guide:` text, `binary(`, `CHANGED_SINCE_PLAN`, `issue plan`.

In `vorher-nachher.de.md` these names stand in "Vorher" blocks only. Its prose and its "Nachher" blocks hold none. `skill: 'SKILL.md'` in a "Nachher" block is the optional path.

## The prototype

`node_modules/typescript/bin/tsc -p .` in `proto/` exits 0, with TypeScript 5.9.3 and Zod 4.6.5. The four links were made as the README says and removed again.

What changed in `index.d.ts`:

- `Code.issue(message?)` returns an issue without a field. `Issue.path` is optional.
- `keyOf` and `detailOf` replace the two old list sources. The undecided declared form of a source is gone.
- `Stored.stringify(value)` replaces the old name, and `Stored.parse(text)` is new (question 3).
- `root(name, from)` takes no options.
- `Remote.get(path, schema, { query, on })`. `find` is gone.
- `Files.update(file, limit, old => next)` answers a promise. `Act` has `send` only.
- `Changes.more` is always there.
- `ReadSpec.output`. With it, `run` must answer what the schema declares.
- An effect answers `plan & apply` to `next`, and `plan & Partial<apply>` to `text` and `invoke`. `apply` returns an object.

Files: `hello.ts`, `hello2.ts`, `tracker.ts`, `tracker.test.ts`, `lintkit.ts`, `notes.ts`, `global.ts`, `needs.ts`, `rules.ts`, and under `examples/`: `read.ts`, `refuse.ts` (new), `effect.ts`, `datafolder.ts`, `stored.ts`, `hello.test.ts`.

37 cases must not compile, each behind `@ts-expect-error`: 19 in `hello2.ts`, 7 in `tracker.ts`, 5 in `global.ts`, 3 in `examples/stored.ts`, 2 in `needs.ts`, 1 in `lintkit.ts`. In a scratch copy with all 37 directives removed, tsc reports exactly 37 errors, each on the intended line and for the stated reason. New among them: `files.update` with the old two arguments, a `mode` on `files.update`, a third argument to `root`, `.at()` without a field, a refusal at a field in a command without input, the two old import names, the old name on a stored kind, `api.find`, a query as the third argument of `get`, `act.write`, `text` reading what only `apply` adds, an `apply` that returns a number, a `run` that does not answer its `output`, and `answer.needs`.

How the code blocks were checked: a script takes every `ts` block of a Markdown file, trims each line, drops empty lines, and looks for the same run of lines in one file under `proto/`.

| File                   | `ts` blocks | Not found |
| :--------------------- | :---------- | :-------- |
| `guide.md`             | 70          | 0         |
| `guide.de.md`          | 70          | 0         |
| `cheatsheet.de.md`     | 18          | 0         |
| `vorher-nachher.de.md` | 37          | 0         |

The 22 "Vorher" `ts` blocks show old APIs and are not checked. Nothing runs: every console output in the docs is written by hand from the design.

Form: the Markdown files and the prototype files are formatted with Prettier and the config in the home folder (print width 100). 17 of the 121 blocks of the guide are longer than 8 lines. They are whole commands or tests.

## Questions for the owner

Each point had to be interpreted. The recommendation stands first, and it is what the docs now say.

1. **The tracker speaks of tickets.** Decision 30 names only the schema `Ticket`. Recommended: tickets throughout (`ticket list`, `ticket show`, `ticket create`, `ticket schedule`, `TICKET_NOT_FOUND`), so "issue" means one thing in the guide. Otherwise: only the schema is renamed and the commands stay `issue ...`.
2. **A missing field whose own list needs another missing field (M8 under 27).** Recommended: its issue has no `command`, and its hint names the field to give first. adx then never names a command that is refused. Otherwise: name `tracker ticket schedule --team` anyway, and accept one refused call.
3. **`Friend.parse(text)`.** The function form of `files.update` hands the old text to the author. A stored kind needs a way to read it. Recommended: `Friend.parse(text)` beside `Friend.stringify(value)`. Otherwise: a form `files.update(file, limit, Friend, old => next)` that parses and writes for the author.
4. **`files.update` answers a promise, `files.write` does not.** adx has to read the file. Recommended: keep it so. Otherwise: both answer a promise.
5. **The code for `--replace` with nothing to replace (39, S8).** Recommended: `UNKNOWN_OPTION`, raised when the plan stages no `files.write`. That also covers a plan with `files.update` only. Otherwise: a code of its own.
6. **`more` in `changes` (40).** Recommended: always there, 0 when nothing was left out. An author's own `changes` must then write `more: 0`.
7. **`.at(field)` without a message (S9).** Recommended: the message repeats the hint of the code.
8. **The kind of `failed(state, cause)` (S9).** Recommended: adx sorts the cause as it sorts every error nobody mapped. `failed` only adds the sentence.
9. **How a field becomes an option (S6).** Recommended: kebab case; a boolean is a switch without a value, and false goes through `--json` only; a field named like one of adx's options or like a root is a `DECLARATION` error. Otherwise: add `--no-<name>` for a switch.
10. **What a derived command carries (S7).** Recommended: the fields of the call that the named command has under the same name. So the list call for `--lang` reads `hello greet --name Ada --lang`. A step the author wrote carries only its own fields, plus global fields and the data folder.
11. **A `mode` on a replace (S12).** Recommended: a `mode` given to `files.write` holds on a replace too. Without one, the replaced file keeps its mode.
12. **The terminal form of a refusal (S5).** The block in "Run it" is a proposal: a head line with the kind and the state, then per issue the code, the field, the message, the hint and the command.
13. **The name of the fingerprint file (37).** The docs say "a file next to `package.json`". Recommended: `adx.stored.json`. The docs name it once the owner agrees.
14. **What counts as a long list or a large document (26).** The docs repeat the words of the decision. Recommended: more than one page of entries (50) in an array, or more than 8 KiB of answer, in any probe.
15. **What `output` does beyond `--fields` (26).** Recommended: `schema` shows the fields of the answer, and the read still answers everything when no field is named.
16. **`on` for a send (42).** The docs give `on` to `get` only, and "Known limits" says so. Recommended: give `act.send` the same option later, since a 409 mostly answers a send.
17. **`apply` must return an object (24).** Recommended: yes, by type, since adx merges it. A dry run and a real run then differ only in the fields `apply` adds.
18. **The report line for a skill (34).** Recommended: "none named" without a skill, and "named" with one that passes the check. Never "met".
19. **`needs` still names two things (S10).** It is what a source returns and a method of a step. No decision renames it. Recommended: leave it.
20. **The length of the guide (S4).** The repetition is gone, but 20 new decisions added text. Recommended: keep the three use cases. Otherwise: drop `lintkit` to its two new parts, which saves about 80 lines.
