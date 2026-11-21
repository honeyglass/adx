# adx v2 docs: final review

Reviewed on 2026-11-20: `guide.md`, `guide.de.md`, `cheatsheet.de.md`, `vorher-nachher.de.md` and
`proto/`, against decisions 1 to 22 and the 16 Agent DX rules. Nothing but this file was changed.
`d.ts` below means `proto/adx/index.d.ts` (it stood in `proto/node_modules/@honeyglass/adx/` then). A line number given for
`guide.md` holds for `guide.de.md` too: the two files have the same lines.

## Verdict

The docs express all 22 decisions, present nothing undecided as decided, and every code block is
real: it stands word for word in a prototype that compiles. They are not ready as the final
description of the API, because four documented APIs let an author get around a rule (the answer of
`apply`, `act.write`, a `read` that returns a list, a missing way to delete a file), one advanced
example breaks rule 5 itself, and one line of prose shown in three files does not compile. As a
guide for a person it is correct but long, and its Basics chapter uses five concepts before it
explains them.

## What was checked, and how

- **tsc**: `tsc -p .` in `proto/` exits 0 (TypeScript 5.9.3, Zod 4.6.5). The four links were made
  as the README says and removed again.
- **Code blocks**: all 60 `ts` blocks of `guide.md` stand line for line in a file under `proto/`,
  so all 60 are valid, the advanced ones included. The same holds for the 13 blocks of the cheat
  sheet and the 29 "Nachher" blocks of the before/after page.
- **Negative cases**: in a copy with all 25 `@ts-expect-error` lines removed, tsc reports exactly
  25 errors, each on the intended line and for the stated reason.
- **Prose claims about types**: checked with small probe files in a scratch folder (results below).
- **Translation**: the `ts`, `console` and `json` blocks of the two guides are identical; all prose
  of `guide.de.md` was read against `guide.md`; a scan found no missing umlaut; the 9 in-page links
  of each guide resolve.
- **Console outputs**: checked against the code above them, byte counts included (26 and 33 are
  right).
- `review-docs.md` and two earlier design notes (since removed) were opened only after the
  findings stood, to check three doubts.

## Findings: must fix

### M1. The advanced example `issue plan` answers two shapes (rule 5)

- Where: `guide.md:1065-1081`, `proto/tracker.ts:150-164`, `d.ts:261-270`.
- What: `plan` returns `{ id, team, milestone }`, `apply` returns the server's `Issue`
  (`id, title, state, labels, body`). The dry run and the real run of one command answer different
  objects. `guide.md:378` says "The dry run and the real run answer the same shape. Only `applied`
  differs", and rule 5 asks for it ("the dry run answers in the shape of the real answer").
- Why it matters: the type of `apply` is free (`A` has no relation to `O`), so every author can do
  the same, and the guide shows it as the model. An agent that read the dry run cannot read the
  real answer with the same code.
- Fix: in the example, `return { ...planned, issue: await act.send(...) }`, as `issue create` does.
  In the API, close it by type: either adx merges (`answer = { ...planned, ...applied }`, typed
  `O & A`), or `apply` must return a type that extends `O`. See question 2.

### M2. `act.write` and `act.update` move the file check behind the send (decision 10, rules 5 and 9)

- Where: `guide.md:1377`, `cheatsheet.de.md:119`, `d.ts:210-212`.
- What: one sentence says a file whose content needs the server's answer is staged in `apply`. Then
  `ALREADY_EXISTS`, `FILE_NOT_FOUND` and the target checks cannot come in `plan`. Decision 10 says
  "The refusal already comes in `plan`, so also in a dry run". Here the dry run passes, the real
  run sends, and then the write is refused.
- Why it matters: it is the one path where a dry run does not run "the same checks as the real
  run", and where a refusal comes after an effect that cannot be taken back.
- Fix: take both out of the guide, the cheat sheet and `d.ts` until a tool needs them (no example
  uses them). If they stay: `plan` must announce the file (for example `files.later(file)`, which
  runs the checks and shows `replaces`), and `apply` only fills it. See question 3.

### M3. No way to delete a stored file

- Where: `d.ts:201-209` (`Files` has `write` and `update` only), `guide.md` chapter 4.
- What: `hello friends remove` cannot be written with adx. The author must call `unlink` from
  `node:fs` in `apply` and write the `state` sentence by hand with `failed`. Such a command has no
  plan-time check, no "all or nothing" with other files, and the kit cannot see what a dry run did.
- Why it matters: rule 5's probe starts with "list every command that writes, deletes or sends".
  A tool that stores items almost always removes them too, so the most common third command falls
  outside every guarantee of chapter 4.
- Fix: `files.remove(file)`: staged in `plan`, refused with `FILE_NOT_FOUND` when the file is
  missing, shown in the answer (`{ file, removes: true }`), done with the other staged files. Until
  then, name the gap in "Known limits". See question 1.

### M4. Rule 16 holds for `list` only

- Where: `d.ts:249-252` (`ReadSpec`), `guide.md:1524` (`--fields` on a `list`), `guide.md:1628`.
- What: the answer of a `read` is any value. `tracker.read({ name: 'projects', run: () =>
api.get(['projects'], Named) })` compiles and answers a whole list without outline, fields or
  pages. A `read` that shows one large stored document has no `--fields` either. Rule 16 names both
  cases ("a list, a whole stored document or a text read from outside").
- Why it matters: `cheatsheet.de.md:7` says all 16 rules are built in. For this rule the author's
  choice of `read` or `list` decides, and nothing warns.
- Fix: let a `read` declare its answer (`output: Schema`, optional). With it, `--fields` works,
  `schema` shows the answer (this also closes the known limit at `guide.md:1628`), and the kit can
  refuse a `read` whose answer is an array. Without the change, say in the guide which rules adx
  guarantees and which it only supports. See question 4.

### M5. The cheat sheet claims 16 rules; rule 6 is optional by decision 7

- Where: `cheatsheet.de.md:7` ("Die 16 Agent-DX-Regeln sind dabei eingebaut"), `:260`
  ("`conformance`: prüft jeden Befehl gegen die 16 Regeln"), `:417`.
- What: a tool without `skill` passes `conformance`, and it does not meet rule 6. With `skill`, the
  kit checks a frontmatter, not what rule 6 asks of the manual.
- Fix: say it as it is: adx builds in 15 rules; rule 6 is the author's, and adx only checks that a
  named skill file is a skill. `adxcheck report` should print "Agent skill: none named" and not
  "met". `guide.md:24` and `:41` ("all of the above", "these rules") are fine as they stand.

### M6. `.needs('cv')` does not compile

- Where: `guide.md:515`, `guide.de.md:515`, `cheatsheet.de.md:177`.
- What: the sentence is about a step to `greet`, which has no field `cv` (a leftover from another
  tool). Probed: `greet.step({ lang: 'de' }).needs('cv')` fails with "'"cv"' is not assignable to
  parameter of type '"name" | "lang"'".
- Fix: `.needs('style')`, the optional field of `greet` that the step leaves open.

### M7. `tell('nothing to fix')` names a step where nothing follows (rule 14)

- Where: `guide.md:1198`, `vorher-nachher.de.md:238`, `proto/lintkit.ts:55`.
- What: with no finding, the list returns a step for the person that asks for nothing.
  `guide.md:519` says "return none when nothing follows", and rule 14 says "an empty or invented
  step sends the agent in a circle".
- Fix: turn the condition round, so the step asks for something:
  `out.items.length > 0 ? [tell('fix the findings, then run the check again')] : []`.

### M8. A named step that does not run as it stands: `tracker issue plan --team`

- Where: `guide.md:1083-1091`, `cheatsheet.de.md:353-359`.
- What: the `team` source needs the project (`proto/tracker.ts:51-55`), so the second named command
  is refused when run as shown. `guide.md:1462` says "A step without `needs` must run as it
  stands". The console shows only `.command`, so the reader cannot see whether the step carries
  `needs`.
- Fix: show the whole steps, the second one with `"needs":["project"]`, and say in one sentence
  that adx asks the source of each missing field what that source needs in turn.

### M9. A command without input cannot refuse, and no issue can stand without a field

- Where: `d.ts:36-42` (`Code` has only `.at(path)`).
- What: probed: in a command without `input`, `refuse(code.at('friends'))` fails with "Issue<"friends">
  is not assignable to Issue<never>", and `code.at()` fails too. A refusal that concerns no field
  ("no friend is stored yet", "the server is in maintenance") must be pinned to an unrelated field
  (`proto/tracker.ts:195` pins `STILL_OPEN` to `id`) or thrown, which makes it a `bug` with exit 2.
- Why it matters: rule 10 breaks at this point: a refusal the agent could act on becomes a fault of
  the tool. The answer shape already allows it (`path?` in `d.ts:171`).
- Fix: one more method, such as `code.issue(message?)`, that returns `Issue<never>`; it fits every
  `refuse` and every `check` without a change to their types.

### M10. "cannot" at `guide.md:36` is not true as written

- Where: `guide.md:36`, `guide.de.md:36`.
- What: "A tool built on it cannot guess at a typo, write half a file or send on a dry run." That
  holds for writes through `files` and sends through a `remote`. A handler that calls `node:fs` or
  `fetch` does both, and `guide.md:1600-1601` says so itself.
- Fix: "As long as files go through `files` and requests through a remote, a tool cannot ...; the
  test kit fails a probe that changed the scratch folder or reached the fake on a dry run." If the
  kit does not compare the folder before and after, say that too.

### M11. `option: false` drops the data folder from named commands (rules 12 and 14, decided in 13)

- Where: `guide.md:642-646`, `cheatsheet.de.md:195`.
- What: the guide states the consequence ("adx cannot carry the folder"), so the text is honest.
  The effect is still the one decision 13 was made against: a named command, followed word for
  word in a new shell, lands in the real data.
- Fix: the owner decides (question 6). At least the kit should report rules 12 and 14 as "partly"
  for such a root, with this reason.

## Findings: should fix

### S1. `Answer` has no `needs`

- Where: `d.ts:164-172`, against `guide.md:1007` and `:1560`.
- What: the refusal of a source that needs fields carries `needs` at the top. Probed:
  `answer.needs` does not compile, so an author cannot assert it after `invoke`.
- Fix: add `needs?: string[]` to `Answer`.

### S2. Basics uses five concepts before it explains them

- Command handle: used at `guide.md:485` and `:504`, never defined. The guide shows `hello.read({`
  for `greet` without `const greet =`, and no `const add =` at all, yet `greet.step` (`:507`) and
  `add.step()` (`:526`) follow. Fix: one sentence at the first `step`: "`hello.read` returns a
  handle; keep it in a `const` to name the command in steps and tests", and write the `const`.
- `values`, `oneOf`, `refuse`, a code: all four appear in the list section (`:295-306`), two to
  three sections before theirs. Fix: order Basics as read, lists of values, refusing, the long
  list, the effect, next steps.
- Names that are never defined: `LANGUAGES` (`:274`), `byCode` and `unknownLanguage` (`:302`),
  `english` (`:466`), `blankName` (`:495`). Fix: one block with the array and `byCode`, and one
  line per code.
- `FriendIn` (`:705`) is called "the input schema of `friends add`", which was written inline
  there (`:348`).

### S3. The first example guesses

- Where: `guide.md:205-207` (`hellos[lang] ?? 'Hello'`) and `:466` (`?? english`).
- What: `hello greet --name Ada --lang xx` answers "Hello, Ada!" in the first example. The page
  before says the tool "never guesses".
- Fix: make `lang` a `z.enum(['en', 'de', 'eo'])` in the first example. That shows the fixed list
  early, needs no fallback, and the later section only adds the computed list. For `:466`, throw
  in the branch adx has already ruled out; a `bug` is the honest answer there.

### S4. Length: about 250 lines can go without losing a fact

- "1. What adx is" (12 points) and "Why adx" (6 points, unnumbered between 1 and 2) say the same
  list twice; 70 lines pass before the first code. Fix: one list, then the two-mistakes example,
  then the quickstart; the comparison with other frameworks in three lines.
- The refusal for an existing file is shown three times in full: `:380-385`, `:672-679`,
  `:1312-1317`. "Writing with `files.write`" (`:660-668`) repeats `:321-358`.
- Chapter 4 (230 lines) stands between Basics and Advanced. A newcomer reads file modes, change
  lists and format numbers before the first remote call. Fix: keep "where, moving, write, replace,
  update" there; move "Creation and file modes", "What a replacement changes" and "Older files"
  behind Advanced, or mark them as reference.
- "Writing files safely" (`:1259-1377`) is the third telling of write, replace and update. Keep
  what is new: `outFile` and `inFile`, several files, the two failure states.

### S5. No refusal is shown as a person sees it

- Where: `guide.md:1560`.
- What: every refusal in the guide is piped through `jq`. The only word on the terminal form is
  "the text of `refusal()` from `@honeyglass/utils/ts`", a function of another package.
- Fix: show one refusal at a terminal, in the quickstart, and drop the reference.

### S6. How a field becomes an option is not said

- Where: `guide.md:1529-1538`.
- Missing: the option name of a field such as `dueDate`; how a boolean is given and switched off;
  that a number is parsed; `--opt=value` for a value that starts with a dash (design.md asks for
  it); which names are taken. A field named `output`, `json`, `fields`, `page`, `replace`, `help`
  or `version`, or named like a root (`home`), collides with adx's own option. `--output` for a
  target file is the first name many authors pick.
- Fix: five lines in "How adx reads a call", and `DECLARATION` for a taken name.

### S7. Which options a filled-in command carries

- Where: `guide.md:490` ("with the other options of the call") against `:426`
  (`"command":"hello greet --lang"` for a call that had `--name Ada`).
- Fix: state the rule the examples follow: the data folder, the global fields, and the fields of
  the same name the target command has.

### S8. `--replace` on a call that writes nothing

- Where: `guide.md:695`.
- What: no code is named for the refusal (an earlier design note said `UNKNOWN_OPTION`), and "writes no
  file" is unclear for a `files.write` to a new name (it writes a file and replaces nothing; the
  call presumably passes).
- Fix: "A call with `--replace` whose plan stages no `files.write` is refused with ...".

### S9. Three small gaps in "Refusing bad input"

- The layers at `guide.md:498` and `cheatsheet.de.md:418` (arguments, schema, `check`, handler)
  leave out where a value is checked against its list. `:487` relies on it. design.md names the
  layer "meaning".
- `.at('name')` without a message (`:495`, `:1196`, `:1216`): the guide does not say what
  `message` then holds.
- `failed(state, cause)` (`:1595`): no kind and no code are named.

### S10. Names that mean two things, after decision 15 removed two

- `text`: the terminal form of a command, `file.text(limit)`, and now `Friend.text(value)`
  (`:770`). Decision 15 renamed `text()` for exactly this reason. Fix: `Friend.stringify(value)`.
- `needs`: the function a source returns (`needs('project')`) and the method of a step
  (`.needs('style')`), beside the answer field.
- `plan`: the handler, and the command `issue plan` in the section that explains the handler
  (`:1063-1081`). Fix: call the command `issue schedule`.
- `oneOf` and `listedBy` differ in one point (this command shows one item in full), and neither
  name says it; `oneOf` reads like an enum.
- adx exports `File`, `Request` and `Issue`. The first two shadow globals of Node, and the tracker
  example names its own schema `Issue`.

### S11. Stored kinds can be used without being listed

- Where: `guide.md:764`.
- What: `stored: [Friend]` in `tool({...})` is a second registration. If it is left out,
  `file.json(LIMIT, Friend)` still works, `schema` shows no number, and the fingerprint check never
  runs, so decision 21's safety net is skipped without a word. An author who writes
  `JSON.stringify(next)` instead of `Friend.text(next)` stores a file without `version`, which the
  next read takes for format 1.
- Fix: `DECLARATION` when a kind is used that the tool does not list (as for a root, `:611`), and
  one line in "Known limits" (`:1624` names the root only). Also say the order of several `.from`
  calls (newest first, `proto/examples/stored.ts:58-60`); the guide shows one.

### S12. Small facts

- `guide.md:609`: "A tool has one folder for everything it keeps", and 36 lines on a second root,
  `vault`. Say "adx does not split settings from data on its own".
- `guide.md:807`: "Every file in a root is `0600` in any case" is not true with `{ mode: 0o644 }`
  or a kept mode. Say "by default". Also say whether `mode` or the kept mode wins on a replace.
- `guide.md:1623` (and decision 14): the typo error runs ten lines with tsc 5.9.3, not four.
- `guide.md:1620`: the limit also hits when a `run` refuses with `.command(other.step())` and the
  other command names the first in `next` (probed, TS7022 and TS7023). That is the usual pair
  "greet refuses and points at `friends add`; `friends add` names `greet`".
- `guide.md:78`: `import.meta.main` needs Node 24.2, not 24.0.
- `guide.md:68` and `cheatsheet.de.md:383` give two messages for `UNKNOWN_OPTION`.
- `guide.md:371-376` and `:684-691`: the real run prints `applied   true`, the dry run prints
  "dry run: nothing was changed". One of the two forms is enough.

### S13. "adx never reads the skill", and the kit reads it

- Where: `cheatsheet.de.md:60` ("adx öffnet die Datei nie"), `guide.md:554`.
- Fix: "The tool never opens it. Only the test kit reads its frontmatter."

### S14. An undecided API stands in the public types

- Where: `d.ts:61-64` and `:75` (`Needing`), `proto/tracker.ts:65-70` and `:200-216`.
- What: it is marked "not decided" in comments and is absent from the guide, which is right. It is
  also absent from "Proposed, not yet confirmed" in `decisions.md`.
- Fix: remove it from the prototype, or list it there.

### S15. German wording

- `guide.de.md:699` and `cheatsheet.de.md:115`: "das kein `--replace` braucht" says "needs no";
  the English says "takes no", which is the fact (the option does not exist there).
- `guide.de.md:1319`: "nie durchgeschrieben" is not German. "adx schreibt nie durch ihn hindurch."
- `guide.de.md:1598`: "den Server fälschen" means to forge. "den Server durch einen Fake ersetzen".
- Otherwise the translation says what the English says, sentence by sentence, with correct umlauts.

### S16. `replace: false` on four of the six effects

- Where: `guide.md:708`, `:952`, `:1072`, `:1332`.
- What: every command that sends or updates must switch the option off. Decision 16 stands; the
  cost is that an author who forgets it ships an option that is always refused.
- Fix: the kit fails an effect that lists `--replace` and stages no `files.write` in any probe:
  "add `replace: false`".

### S17. `Known` is written by hand

- Where: `guide.md:860`.
- What: `type Known = { project?: string; team?: string }` repeats fields of the schemas and is not
  explained. Fix: one sentence (a source that stands before its command names the fields it reads),
  or show the source inline in `values`, where the type is inferred.

## Decisions the docs had to interpret: questions for the owner

1. **Deleting a stored file (M3).** (a) Add `files.remove(file)` now, staged like `update`, refused
   when the file is missing, no flag. (b) Defer it and name the gap in "Known limits".
   Recommended: a.
2. **The answer of `apply` (M1).** (a) adx merges: the real answer is `{ ...planned, ...applied }`,
   so `apply` returns only what is new. (b) `apply` must return a type that extends the plan's.
   (c) Leave it free and fix only the example. Recommended: a; it also shortens every `apply`.
3. **`act.write` and `act.update` (M2).** (a) Remove them from v2 until a tool needs them.
   (b) Announce the file in `plan`, fill it in `apply`. (c) Keep them and document that the refusal
   comes after the send. Recommended: a.
4. **Rule 16 for `read` (M4).** (a) An optional `output` schema on `read`, which gives `--fields`
   and shows the answer in `schema`. (b) Only a kit probe that fails a `read` answering an array.
   (c) Name it as a limit. Recommended: a, with b.
5. **A refusal that needs fields (decision 14).** The docs show `needs` and `next` at the top of a
   refusal. design.md's one error shape has `issues` and no `next`. (a) Keep `needs` and `next`,
   and also carry one issue per missing field, each with its `command`, so every refusal still has
   the one shape. (b) Only `needs` and `next`. Recommended: a. The docs show no `issues` for this
   answer, so it is open what they print.
6. **`option: false` (M11).** (a) Keep it, and let the kit report rules 12 and 14 as "partly" for
   that root. (b) Carry the folder as a variable in front of the named command
   (`HELLO_VAULT=/x hello ...`), which fails outside POSIX shells. (c) Drop `option: false`.
   Recommended: a.
7. **`files.update(file, data)` now, `files.update(file, limit, old => next)` later (decision 20).**
   The later form changes every `update` call an author wrote. (a) Take the function form now; it
   also removes the separate read in `:1334` and `:768-770`. (b) Keep the data form and accept the
   break. Recommended: a, by the reason decision 15 gives for renaming before the first release.
8. **Renames before the first release (S10).** `Friend.text` to `Friend.stringify`; `oneOf` and
   `listedBy` to names that say the difference; the exported types `File`, `Request`, `Issue`.
   (a) Rename now. (b) Keep. Recommended: a for `Friend.text`, the owner's taste for the rest.
9. **The command of the `ALREADY_EXISTS` refusal.** Decision 10 names the hint only. The docs add
   `--replace --dry-run` to the command (`guide.md:678`, from an earlier design note). (a) Keep the dry run:
   one more call, and the agent sees the changes before it overwrites. (b) `--replace` alone.
   Recommended: a.
10. **The kind of `ROOT_NOT_FOUND` after a wrong `--home`.** It stays `ask`, though an agent's typo
    now causes it. (a) Keep `ask`: one code, one kind, and the safe side. (b) A second code of kind
    `fix` for a value the call gave. Recommended: a.
11. **A refusal without a field (M9).** (a) `code.issue(message?)`. (b) `.at()` with an optional
    path. Recommended: a.

## What is good and should stay

- **Every code block is real.** 60 of 60 blocks of the guide stand in a compiling prototype, and
  the 25 cases that must not compile fail for the stated reason. Keep the script that checks it.
- **The two guides are one text.** Same lines, same blocks, a faithful translation.
- **The quickstart.** Three blocks, one file, one `tsconfig` line, then "What just happened" in
  seven points. A developer sees the whole idea on one screen.
- **One answer shape and one refusal shape**, the same as in design.md, in the guide, the cheat
  sheet and the before/after page. Every code the docs use stands in the list at `guide.md:1566`.
- **Rules by construction.** `ctx` gives each handler only what it may use: a `read` has no
  `files`, `act` exists only in `apply`, a step comes only from a command handle, a field name is a
  key of the schema. Most of the 16 rules follow from that and need no discipline.
- **Decisions are told with their reason**, shortest where it counts: why `--home` is carried into
  named commands (`:631`), why `fresh` refuses nothing (`:413`), `write` against `update` in a
  two-row table (`:719`).
- **The proposal `find` into `get` is not presented**, `CHANGED_SINCE_PLAN` appears nowhere, and
  parallel writes are named as open in one line.
- **"Known limits" is honest**, and "not probed" in `adxcheck report` is the right word.
- **The before/after page**: one change, one "Vorher", one "Nachher". It is the fastest way to
  judge the redesign.
