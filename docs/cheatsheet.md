# adx at a glance

## The idea

adx is a TypeScript toolkit for command-line tools that an AI agent drives.
You describe each command with a Zod schema and a function.
adx reads the arguments, checks them, writes the answer and sets the exit code.

Of the 16 Agent DX rules, 15 are built in. Rule 6, the agent skill, is the author's part.

## The smallest tool

The two blocks together are one file, `hello.ts`. The command stands in `commands`, the table of commands.

```ts
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: {
    greet: read({
      does: 'greets one person',
      input: z.object({ name: z.string().describe('who to greet') }),
      example: { name: 'Ada' },
      run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
  },
});
```

```ts
if (import.meta.main) await hello.main();
```

Add a `tsconfig.json` with one line:

```json
{ "extends": "@honeyglass/adx/tsconfig.json" }
```

adx needs Node 24.2 or later.

## What the caller gets for it

- Text at a terminal, JSON when piped.
- `--name` as an option, the whole input as `--json`, or both in one call.
- All mistakes of a call in one answer, each with a hint.
- `hello schema greet`: the exact input as JSON Schema.
- `hello schema`: every code and what each kind of refusal asks for.
- `hello` alone: the commands and the first step.
- Exit codes 0, 1 and 2.
- A typo in a field name does not compile.

## The API

### The tool

- `tool({ name, version, does, commands })`: declares the tool.
- `commands`: the table of commands. A key is a word of the call, and a table inside the table is a group: `friends: { add }` is `hello friends add`.
- `skill`: optional, the path to the agent skill file, relative to the folder of `package.json`. The tool never opens the file. Only the test kit reads its frontmatter.
- `roots`, `remotes`: the folders and servers the tool may use.
- `stored`: every kind of data the tool stores, with its format number.
- `global`: the input every command shares, declared with `global({...})` (see below).
- `start`: the first steps of the start answer, as a function.
- `next`: steps after a command that lead into another folder, with `after` (see Steps).
- `hello.main()`: runs one call.

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  skill: 'SKILL.md',
  roots: [home],
  commands: {
    greet,
    languages,
    language,
    friends: { add, count },
  },
  start: async () => {
    const friends = await friendNames();
    return friends.length === 0 ? [add.step()] : [greet.step()];
  },
});
```

### The three kinds of command

- `read({...})`: only reads. Handler: `run`.
- `list({...})`: answers a list. Handler: `run`. Needs `item`, `key`, `outline`.
- `effect({...})`: changes something. Handler: `plan`, and for a send also `apply`.

Each returns the command, a value. Write it into the table, or keep it in a `const` above the tool: that is its handle for steps and tests. The constant of a list is named after what it lists, such as `languages`.

### Properties every kind has

- `does`: one sentence on what the command does.
- `input`: the Zod schema of the input. Every field is also an option.
- `example`: a valid input. adx checks it at startup, and the test calls it.
- `values`: where the values of a field come from.
- `check`: rules across several fields. Answers all issues at once.
- `next`: the steps after a success. Gets the answer and the input.
- `text`: the form at a terminal.
- `global`: how the command uses the global fields (see below).

### Properties of one kind

- `read`: `output` (the schema of the answer). With it the command takes `--fields`, and `schema` shows the answer. A `read` that answers a long list or a large document needs it.
- `list`: `item` (the schema of an item), `key` (the field that names an item), `outline` (the further fields of the outline), `pageSize`.
- `effect`: `plan` (checks and plans), `apply` (sends), `look` (the call that shows whether a send took effect), `replace: false` (the command takes no `--replace`).

```ts
output: Ticket,
```

### Handlers: always `(input, ctx)`

| Handler      | `ctx`                      |
| :----------- | :------------------------- |
| `run` (read) | `refuse`                   |
| `run` (list) | `refuse`, `page`           |
| `plan`       | `refuse`, `files`          |
| `apply`      | `refuse`, `act`, `planned` |

```ts
run: (_, { page }) => paged(LANGUAGES, page),
```

### Files in `plan`

```ts
plan: (note, { files }) => files.write(note.file, render(note)),
```

```ts
plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
```

- `files.write(file, data)`: stages a new file. If the file exists already, the call needs `--replace`.
- `files.update(file, limit, old => next)`: stages a change. adx reads the file itself, up to the limit, and calls the function. Takes no `--replace`. A missing file: `FILE_NOT_FOUND`, kind `fix`.
- Both answer `{ file, bytes, replaces }`, and `changes` too on a replace.
- adx writes all staged files after `plan`, all or none. On a dry run adx writes nothing.
- Files exist only in `plan`. There is no `files.remove` yet.

### Sending in `apply`

```ts
apply: async ({ project, title, body, label }, { act }) => {
  const data = { title, body, labels: label };
  const request = api.post(['projects', project, 'tickets'], data);
  return { ticket: await act.send('the new ticket', request, Ticket) };
},
```

- `act.send(label, request, schema)`: sends. `act` exists only in `apply`, and `apply` never runs on a dry run.
- `apply` returns only what the real run adds. The answer is `{ ...planned, ...applied }`.
- The dry run answers what `plan` returns. Both runs have the same fields, and the real one adds those of `apply`.
- Every effect has `--dry-run`. It cannot be switched off.

### Global input

- `const project = global({ input, example, values })`, and `global: project` in the tool: every command takes the fields, such as `--project`.
- `project.read`, `project.list`, `project.effect`: the three kinds, with the global fields typed into every handler. A tool without global input takes the three straight from adx.
- `global: false` on a command: it takes no global field (such as `whoami`).
- `global: { project: 'optional' }`: the field may be missing. `run` sees `string | undefined`.
- `schema` shows for each command whether it takes the option. adx carries the value only into steps to commands that have it.

```ts
// read, list and effect, with the project typed into every handler
export const { read, list, effect } = project;
```

```ts
global: { project: 'optional' },
```

### Value sources in `values`

- `z.enum([...])` in the schema: a fixed list. Nothing more is needed.
- a function: a computed list, `() => [{ value, does }]`.
- `fresh(fn)`: a new name. `fn` answers the names already taken. `fresh` refuses nothing.
- `keyOf(list)`: the field takes a key of that list.
- `detailOf(list)`: like `keyOf`, and this command shows one item in full.
- `needs('project')`: what a source returns when it needs another field first.
- `needs('project', 'team')`: several fields. adx refuses with one issue `MISSING_VALUE` per field, in one answer.
- `Source<{ project: string }>`: the type of a named source. It names the fields the source reads. A source written straight into `values` needs no type.

```ts
values: { name: fresh(friendNames), lang: languageChoices },
```

```ts
values: { code: detailOf(languages) },
```

Every `id()` field needs a source. Otherwise the tool does not start.

### Refusals

- `code('NO_FORMAL_GREETING', 'fix', 'hint')`: declares a code with its kind and hint.
- `.at('style', 'message')`: turns it into an issue at a field. Without a message, it repeats the hint.
- `.issue('message')`: an issue that concerns no field. It has no `path`.
- `.command(step)`: adds a command that helps.
- `refuse(...)` from `ctx`: refuses. The handler returns the result.
- `failed(state, error)`: thrown in `apply`, with a sentence on the state.

```ts
const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
```

```ts
return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
```

Layers: the arguments, the schema, each value against its list, `check`, the handler.

### Steps

- `greet.step({ lang: 'de' })`: a step to a command. It names only real commands and fields.
- adx derives `needs`: the required fields the step leaves open.
- `.needs('style')`: only for an optional field the step still needs.
- `tell('upload the file')`: a step for the person, without a command.
- When nothing follows, `next` returns no step.
- `after(command, fn)` in the `next` of the tool: steps after a command that lead to a command of another folder. `fn` gets what `next` gets.

```ts
next: [after(whoami, () => [tickets.step()])],
```

### Folders and files

- `root('home', envDir('HELLO_HOME'))`: the data folder. Without a second argument it lies in `~/.hello`, derived from the tool's name.
- `envDir('NOTES_HOME', '~/notes')`: a location of its own. adx reads no `XDG_*` variable.
- `root('module', marker('go.mod'))`: the nearest folder with this file. `cwd`: the working directory.
- `dir(root)`, `inFile(root)`, `outFile(root)`: schemas for paths in a folder.
- `home.file('index.md')`: a file of the tool's own.
- `home.list('friends', '.json')`: the files of a subfolder.
- `File`: `rel`, `exists`, `text(limit)`, `bytes(limit)`, `json(limit, schema)`.

### The data folder

- Moving it: with the variable (`HELLO_HOME`) or with the option of the root (`--home`). The option wins and cannot be switched off.
- adx carries the folder into every command it names in `next` or in an issue, as soon as it is not the default one.
- A folder from the variable or the option must exist. An empty value, a relative path, a file or a missing folder: `ROOT_NOT_FOUND`, kind `ask`. adx never falls back to the default.
- The default folder may be missing. A read command and a dry run create nothing. The first real write creates it.
- Modes: `0700` for folders, `0600` for files. A replaced file keeps its mode.
- `files.write(file, data, { mode: 0o644 })`: a mode of its own.
- Every effect takes `--replace`. To a new name it passes. If the plan stages no `files.write`, it is refused.
- With `replace: false`, `schema` does not list the option, and the hint for an existing file is "pick another name".
- `changes`: `{ added, changed, removed, more }`. JSON paths, otherwise lines, at most 20 per list. `more` counts the rest. A plan may return its own `changes`.
- adx stores no secrets. A token comes from an environment variable, such as `bearer('TRACKER_TOKEN')`.

Rule of thumb: `add`, `create`, `save` use `files.write`. `edit`, `update`, `append` use `files.update`.

```ts
const edit = effect({
  does: "changes a friend's language",
  input: FriendIn,
  example: { name: 'ada', lang: 'en' },
  values: { name: friendChoices },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => JSON.stringify({ ...JSON.parse(old), lang })),
});
```

### Stored formats

- `stored('friend', 2, FriendV2)`: a kind of data with its format number.
- `.from(1, FriendV1, old => ...)`: an older format and the step to the next one. Name several from the newest down.
- `stored: [Friend]` in the tool: required for every kind of data.
- `Friend.stringify(value)` writes `"version": 2` into the text. `Friend.parse(text)` and `file.json(limit, Friend)` read it. A file without the field is format 1.
- A read converts an older file in memory only. The next real write stores the new format.
- A newer format: `NEWER_VERSION`. A schema not met: `STORED_INVALID`. Both have kind `ask`.
- The number counts the format of one kind of data, not the version of the tool. You raise it by hand when the stored fields change.
- It never goes down and is never given twice. Each kind of data has its own number, and `tool schema` shows it.
- On its first run the test kit writes a fingerprint of every schema, per number, into a file next to `package.json`. After that it compares. When the schema changes and the number does not, the test fails.

```ts
const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));
```

### Servers

- `remote('tracker', { url: envUrl(...), auth: bearer('TRACKER_TOKEN') })`.
- `api.get(path, schema, { query, on })`: reads. Every answer passes its schema.
- `on: { 404: undefined }`: on this status `get` answers the value, here `undefined`. Any other status works too, such as a 409.
- `api.post(path, body)`: builds a request (also `put`, `patch`, `delete`). Only `act.send` sends it.
- A path is an array of parts: `['projects', project, 'tickets']`.
- adx tries a read again up to 3 times, with a growing pause, on a network error, a 429 or a 503.
- adx never tries a send again. The agent gets kind `retry` and the `look` step.
- The token stands in an environment variable. `schema` names the variable, never its value. A missing variable: `ENV_MISSING`, kind `ask`.

```ts
const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
```

### A tool in folders

- adx assumes no layout. One file works, and so does a cut by feature.
- `bin/`: the entry that calls `main()`. `cli/`: the tool with its table. One folder per feature. `core/`: what features share, such as the remote and `global(...)`.
- A feature imports only from `core/` and from itself, and only `cli/` puts features together. That is the tool's rule, not adx's.
- A schema that one command reads stands in the command. One that several read gets a name, in the feature, such as `ticket.schema.ts`.

```ts
export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  remotes: [api],
  global: project,
  commands: {
    ticket: { list: tickets, show, create, schedule, close },
    whoami,
    stats,
  },
  next: [after(whoami, () => [tickets.step()])],
  start: () => [tickets.step()],
});
```

### Schemas from adx

- `id()`: a name of letters, digits, `-` and `_`.
- `multiline()`: text with line breaks. `z.string()` is one visible line.
- `paged(all, page)`: cuts one page out of an array.

### Tests

```ts
test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/tracker.ts'], samples));
```

- `conformance`: checks every command against the 15 built-in rules, in-process or as a real program.
- `fake(api, routes)`, `reply(503)`: a server for the test, as a table of routes.
- `samples`: `env`, `fakes`, `seed`. What only you know.
- `tickets.invoke(input, options)`: one command without argv, with typed input. Options: the samples, `dryRun`, `replace`.
- The test kit splits every named command (in `next` or in an issue) with `unbash` and checks that adx knows it.
- If the tool names a `skill`, the test kit checks that the file exists and has a frontmatter with `name` and `description`. It reads nothing more.
- An effect that lists `--replace` and never stages a `files.write` fails: add `replace: false`.
- A `read` that answers a long list or a large document without `output` fails.
- `adxcheck report` and `adxcheck run`: the same check as a command. Without a skill the report says "none named", not "met".

## On the command line

The tool alone:

```console
$ hello | jq -c '.result | {name, skill}, .next[0].command'
{"name":"hello","skill":null}
"hello schema"
```

The schema:

```console
$ hello schema greet | jq -c '.result.input.required'
["name"]
$ hello schema | jq -c '.result.kinds.ask'
{"exit":1,"does":"only the person can solve it: stop and ask"}
```

An option without a value lists its values:

```console
$ hello greet --style
option  style
values  casual, formal
```

The input as JSON, as options, or mixed:

```console
$ hello greet --json '{"name":"Ada","lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"name":"Bob"}' | jq -r '.issues[0].code'
REPEATED_OPTION
```

Terminal and pipe:

```console
$ hello greet --name Ada
greeting  Hello, Ada!
$ hello greet --name Ada | cat
{"ok":true,"result":{"greeting":"Hello, Ada!"}}
```

A refusal at a terminal:

```console
$ hello greet --nmae Ada
refused (fix): Nothing was changed.

UNKNOWN_OPTION at nmae
  greet has no option --nmae (its value was Ada)
  hint  Use an option the command lists
  run   hello schema greet
```

Fields and pages of a list:

```console
$ hello languages --fields code,formal | jq -c '.result.items[0]'
{"code":"ar","formal":"As-salamu alaykum"}
$ hello languages --page 10 | jq -c '.next[0].command'
"hello languages --page 20"
```

A dry run:

```console
$ hello friends add --name ada --lang de --dry-run | jq -c '.applied'
false
$ hello friends add --name ada --lang de --dry-run | jq -r '.next[0].command'
hello friends add --name ada --lang de
```

Replacing:

```console
$ hello friends add --name ada --lang en | jq -r '.issues[0].hint'
add --replace to overwrite friends/ada.json
$ hello friends add --name ada --lang en | jq -r '.issues[0].command'
hello friends add --name ada --lang en --replace --dry-run
$ hello friends add --name ada --lang en --replace --dry-run | jq -c '.result.changes'
{"added":[],"changed":["lang"],"removed":[],"more":0}
```

The data folder:

```console
$ hello friends add --name bob --lang en --home /tmp/h | jq -r '.next[0].command'
hello greet --lang en --home /tmp/h
$ HELLO_HOME= hello friends add --name | jq -r '.issues[0].code'
ROOT_NOT_FOUND
```

A source that needs two fields:

```console
$ tracker ticket schedule --milestone | jq -c '.issues[] | {code, path, command}'
{"code":"MISSING_VALUE","path":"project","command":"tracker ticket schedule --project"}
{"code":"MISSING_VALUE","path":"team","command":null}
```

The second issue has no command: the teams need the project first. Its hint says so.

An answer:

```json
{
  "ok": true,
  "applied": true,
  "result": {},
  "next": [{ "does": "...", "command": "...", "needs": ["..."] }]
}
```

A refusal:

```json
{
  "ok": false,
  "kind": "fix",
  "state": "Nothing was changed.",
  "issues": [
    {
      "code": "UNKNOWN_OPTION",
      "path": "nmae",
      "message": "greet has no option --nmae (its value was Ada)",
      "hint": "Use an option the command lists",
      "command": "hello schema greet"
    }
  ]
}
```

A refusal holds issues only. `next` belongs to a success.

What else adx gives every tool:

- `--output text` or `--output json`: forces the form.
- `--dry-run`: on every effect.
- `--replace`: on every effect, except with `replace: false`. Allows `files.write` to replace a file.
- `--fields`: on every list and on every `read` with `output`.
- `--home`: on every command of a tool with such a root.
- `--help` and `--version`. The help comes from the command table. There is no help text to write.
- `hello friends` (a group alone): lists its actions.
- `read` and `list` refuse `--dry-run`, like any unknown option.

What a named command carries:

- the fields you gave the step;
- for a derived command, the fields of the call with the same name;
- the global fields, and the data folder when it is not the default one.

Exit codes and kinds:

| Exit | Kind    | Meaning                      |
| :--- | :------ | :--------------------------- |
| 0    |         | success                      |
| 1    | `fix`   | the caller fixes the input   |
| 1    | `ask`   | only the person can solve it |
| 1    | `retry` | a later call may succeed     |
| 2    | `bug`   | the tool broke               |

## The 16 rules and adx's part

adx builds in 15 rules. Rule 6 is the author's.

1. Raw JSON input: `--json` fills the same schema as the options, also together with them.
2. Schema at run time: `tool schema` prints the schema adx checks with, and the kinds, codes, roots and format numbers.
3. JSON when piped: only adx writes to stdout.
4. Input hardening: `id()`, `dir`, `inFile`, `outFile`, every path stays in its root.
5. Dry runs: `--dry-run` runs only `plan`. `act.send` exists only in `apply`. The real run answers the plan and what `apply` adds. Replacing needs `--replace` and shows `changes`.
6. Agent skill: not built in. The author writes the skill. adx only checks that a named skill file exists and has a frontmatter.
7. Checks in layers: the arguments, the schema, the lists, `check`, the handler.
8. Errors with a hint: `code()` requires the hint, `.at()` the field.
9. All or nothing: all files go through `write` and `update` in `plan`. adx writes them at the end.
10. Exit codes 0, 1, 2: adx sets them from the kind of the code.
11. Plan before the file: `plan` is the answer of the dry run.
12. Hints that run: adx fills `command` from the source of the field and carries the data folder into it.
13. Options that list: every source in `values` also answers the empty option.
14. Next steps: `start`, `next`, `after`, steps only from commands, `needs` derived.
15. Nothing passes silently: adx checks every argument itself.
16. Context discipline: `outline`, `--fields`, `--page`, the step to the `detailOf` command, `output` on a `read`.

## How adx is built

- TypeScript with Zod. Field names are keys of the derived type. A typo does not compile.
- No CLI framework. adx reads argv with `util.parseArgs` (`strict: false`, `tokens: true`) and checks every token itself.
- An option followed by an option counts as given without a value. An unknown option is collected, and reading goes on.
- All mistakes of a call come back in one answer.
- Options and `--json` fill one object. A field given by both is refused (`REPEATED_OPTION`).
- A field `dueDate` is the option `--due-date`. A boolean field is a switch without a value.
- Routing and help come from adx's own command table, which the `commands` of the tool fill.
- adx assumes no folder layout. A command is a value, and the table takes it from wherever it lies.
- The agent skill is not part of the toolkit. The tool never reads it, never embeds it and never prints it. It only names the path, and the start answer shows it.
- adx's codes and kinds stand once, in adx. Every tool prints them with `tool schema`.
- No guide text and no free help text in the tool. The first steps come from the `next` of the start answer and from the hints of the refusals.
- `api` runs on RxJS inside: retries, timeouts, the cancelling of several requests. The author sees none of it.
- Node does not check types. The safety holds where `tsc --noEmit` runs: in the editor, before the commit and in CI.

## Known limits

- A stored file cannot be deleted through adx yet.
- Two calls that write the same file at the same moment are not coordinated. The later one wins.
- A handler that calls `node:fs` or `fetch` itself is outside the rules.
- The skill is not checked against the tool.
- `on` exists for `get` only. You read the status of a send with `status(error)`.
- Two files that need each other while they load (`detailOf`, `keyOf`) break on the import order.
- A hint (`.command(step)`) and a `look` name commands of their own folder. Only a `next` can be moved to the tool with `after`.
