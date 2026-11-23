# adx

Build command-line tools that AI agents and people can both use well. In TypeScript.

## 1. What adx is

adx is a TypeScript toolkit for command-line tools. You describe each command with a Zod schema for its input and a function that does the work. adx reads the arguments, checks them, writes the answer and sets the exit code.

The name is short for Agent DX: how easy a tool is for an AI agent to use. An agent is a program, often a language model, that runs your tool to do a task. It cannot ask a colleague what an option means. It reads what the tool answers.

The idea: the agent judges, and the tool checks. An agent can be wrong without noticing. So every call passes checks that refuse what does not fit and say how to fix it. A rule that stands only in the agent's prompt can be skipped. A rule in the tool cannot.

What a tool built on adx does, without code from you:

- **JSON when piped, text at a terminal.** `hello greet --name Ada | jq` gets one JSON document. The same call at a terminal prints readable lines.
- **Every mistake at once, each with its fix.** All mistakes of a call come back in one answer. Each names its field, its fix and, where one helps, a command to run.
- **Nothing passes silently.** An unknown command, option, word or input field is refused. adx never guesses.
- **Options that list their values.** `--lang` given without a value answers the languages the tool knows.
- **A schema at run time.** `hello schema greet` prints the exact input the command accepts. `hello schema` prints every code and what each kind of refusal asks for.
- **Dry runs.** Every command that changes something takes `--dry-run`. It runs the same checks, answers what would happen and changes nothing.
- **Files written whole.** A command writes all of its files or none. A file that exists is replaced only with `--replace`, unless the tool builds it again from its data, and a dry run shows what the replacement changes.
- **Next steps.** The tool alone says where to start. A success names the commands that can follow, ready to run.
- **Short answers by default.** A long list answers an outline. The caller names the fields it wants, or asks for the next page.
- **One answer shape.** Every adx tool answers the same JSON, with the same four kinds of refusal and the exit codes 0, 1 and 2. An agent learns it once.
- **The person decides.** A token comes from the person's environment, never from a call. A refusal of kind `ask` stops the agent until the person answers.
- **Typos that do not compile.** Every place you name a field, such as `values: { lang: ... }`, is checked by the TypeScript compiler. `values: { lnag: ... }` is an error in your editor.
- **A test kit.** One call in `node --test` probes every command for all of the above.

These points are 15 of the 16 Agent DX rules. The sixteenth is a manual for agents, the agent skill. It is yours to write: adx only checks that a skill file you name is one.

The list holds as long as your files go through `files` and your requests through a remote, the two ways adx gives you. A handler that calls `node:fs` or `fetch` itself is outside it. The test kit runs every dry run in a scratch folder against a fake server, and fails when either was touched.

Usual CLI frameworks, such as commander, yargs, oclif or cobra, parse arguments for a person who reads an error and tries again. What an agent needs on top is left to you, in every tool. oriko, a CV tool, has it written by hand: about 1,450 lines (about 950 without blank and comment lines), and about 600 lines of tests for them.

Here is one call with two mistakes. A usual framework stops at the first, as prose on stderr:

```console
$ hello greet --nmae Ada again
error: unknown option '--nmae'
```

The agent learns one mistake of two, and no fix. adx answers both in one refusal of kind `fix`, and says what the call left. Each issue names its place, its fix and a command that helps:

```json
{
  "code": "UNKNOWN_OPTION",
  "path": "nmae",
  "message": "greet has no option --nmae (its value was Ada)",
  "hint": "Use an option the command lists",
  "command": "hello schema greet"
}
```

## 2. Quickstart

### Install

adx needs Node 24.2 or later, which runs `.ts` files directly.

```console
$ mkdir hello && cd hello
$ pnpm init && pnpm pkg set type=module
$ printf 'autoInstallPeers: false\nstrictPeerDependencies: true\n' >> pnpm-workspace.yaml
$ pnpm add github:honeyglass/adx#<sha> github:honeyglass/utils#<sha> zod
$ pnpm add -D typescript @types/node
```

adx comes from GitHub, not from npm. Name it and `@honeyglass/utils`, which adx needs beside it, each by the full sha of a commit. The two settings make the install stop with "missing peer @honeyglass/utils" when utils is left out, instead of fetching it from GitHub on its own.

Node strips the types and runs the file. It does not check them. The compiler does that, and it needs a `tsconfig.json`. One line is enough, because adx ships the base:

```json
{ "extends": "@honeyglass/adx/tsconfig.json" }
```

### One tool, one file

The two blocks below are one file, `hello.ts`. First the tool. Its one command stands in `commands`, the table of the tool's commands:

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

And the line that runs a call:

```ts
if (import.meta.main) await hello.main();
```

Beside `package.json`, these two files are the whole tool: `hello.ts` and `tsconfig.json`.

### Run it

At a terminal:

```console
$ node hello.ts greet --name Ada
greeting  Hello, Ada!
```

Piped into another program, the same call answers JSON:

```console
$ node hello.ts greet --name Ada | cat
{"ok":true,"result":{"greeting":"Hello, Ada!"}}
```

The call with two mistakes is refused with both. This is the refusal as a person sees it:

```console
$ node hello.ts greet --nmae Ada again
refused (fix): Nothing was changed.

UNKNOWN_OPTION at nmae
  greet has no option --nmae (its value was Ada)
  hint  Use an option the command lists
  run   hello schema greet

UNEXPECTED_ARGUMENT at again
  greet takes no word after its options
  hint  Remove the word, or pass it as the value of an option
  run   hello schema greet
$ echo $?
1
```

The tool alone tells a newcomer where to start:

```console
$ node hello.ts
hello 0.1.0: greets people

Commands:
  greet   greets one person

Next:
  hello schema   shows every command and its input
```

The rest of this guide writes `hello` for `node hello.ts`. [How is a tool shipped and run?](#7-faq) shows how to put it on the path.

### What just happened

1. `read` made a command that only reads, and the key `greet` in `commands` is the word that calls it. Its input is a Zod schema. `.describe()` gives each field the text that `schema` and `--help` print.
2. `run` receives the parsed input. Its type, `{ name: string }`, comes from the schema. You never write it. Write `({ nmae })` and the compiler refuses it.
3. adx made the option `--name` from the field `name`. A field without `.optional()` or `.default()` is required. The same input also goes in whole as `--json '{"name":"Ada"}'`.
4. Your function returned a value. adx wrote it: text at a terminal, one JSON document when piped. Your code never writes to stdout itself.
5. The bad call never reached your function. adx read every argument, collected every mistake, and answered them together with exit code 1.
6. `example` is a valid input, typed by the same schema. adx checks it at startup, prints it in `hello schema greet`, and the test kit uses it as a call that must succeed.
7. `import.meta.main` is true only when Node starts this file, so a test can import `hello` without running it.

## 3. Basics

This chapter grows `hello` one feature at a time. Each section shows only the new part. Every name of adx in the code, such as `id` or `root`, is an import from `@honeyglass/adx`.

### A command that reads

`read` takes a function from input to output. Here `greet` learns three languages. The command moves out of the table into a constant, so that later sections can name it:

```ts
const hellos = { en: 'Hello', de: 'Hallo', eo: 'Saluton' };

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
  }),
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${hellos[lang]}, ${name}!` }),
  text: out => out.greeting,
});
```

The tool lists the constant under the word that calls it. `{ greet }` is short for `{ greet: greet }`:

```ts
commands: { greet },
```

- `read` returns the command. The constant is its handle: later sections name the command through it, in next steps and in tests.
- The schema stands in the command, where you read it. A schema that several commands read gets a name of its own.
- `lang` has a default, so `run` always sees one of the three codes, while `example` may leave it out. adx types `example` by what a caller writes, and `run` by what the schema answers.
- `text` sets the terminal form. Without it, adx prints each field on a line.

```console
$ hello greet --name Ada --lang de
Hallo, Ada!
$ hello greet --json '{"name":"Ada","lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
```

Options and `--json` work in one call. Both fill the same object, so an agent can append JSON to a command the tool proposed, without rewriting it. A field given by both is refused:

```console
$ hello greet --name Ada --json '{"lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"name":"Bob"}' | jq -r '.issues[0].code'
REPEATED_OPTION
```

Any program can ask what the command accepts:

```console
$ hello schema greet | jq -c '.result.input.required'
["name"]
$ hello schema greet | jq -c '.result.input.properties.lang.enum'
["en","de","eo"]
```

adx prints the JSON Schema of the same Zod object it parses with, so the two never differ. An unknown field is refused, never dropped. A `z.string()` takes one visible line. For text with line breaks, use adx's `multiline()` schema.

### Options and their values

Tell adx where an option's values come from, and three things follow. The option given without a value lists them. A value outside the list is refused. The refusal names the command that lists them.

A fixed list is a `z.enum`, as `lang` above. There is nothing else to write:

```console
$ hello greet --lang
option  lang
values  en, de, eo
$ hello greet --name Ada --lang xx | jq -c '.issues[0] | {code, command}'
{"code":"NOT_IN_LIST","command":"hello greet --name Ada --lang"}
```

A list that is computed when needed is a function. Say `hello` grows to 42 languages, kept in a table in the code:

```ts
const LANGUAGES = [
  { code: 'ar', name: 'Arabic', hello: 'Marhaba', formal: 'As-salamu alaykum' },
  { code: 'de', name: 'German', hello: 'Hallo', formal: 'Guten Tag' },
  { code: 'en', name: 'English', hello: 'Hello', formal: 'Good day' },
  { code: 'eo', name: 'Esperanto', hello: 'Saluton' },
  // ...and 38 more
];
const byCode = (code: string) => LANGUAGES.find(l => l.code === code);
```

A source is a function that answers choices. Each choice has a `value` and may say what it `does`:

```ts
const languageChoices = () => LANGUAGES.map(l => ({ value: l.code, does: l.name }));
```

`lang` becomes a plain string in the schema, and `values` of the command names its source:

```ts
lang: z.string().default('en').describe('the language code'),
```

```ts
values: { lang: languageChoices },
```

The keys of `values` are fields of the input. `values: { lnag: languageChoices }` does not compile. A source gets the input of the call, as far as it is known, so a list can depend on another field. The [tracker](#wrapping-a-remote-api) shows that.

### Refusing bad input with a hint

Some checks need your knowledge. Here `greet` gets a second option, and not every language has a formal greeting:

```ts
style: z.enum(['casual', 'formal']).default('casual').describe('how to greet'),
```

Declare a code once, with its kind and a hint, and refuse with it where it applies:

```ts
const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
```

The kind tells the caller what to do next:

| Kind    | Exit | Meaning                      |
| :------ | :--- | :--------------------------- |
| `fix`   | 1    | the caller fixes the input   |
| `ask`   | 1    | only the person can solve it |
| `retry` | 1    | a later call may succeed     |
| `bug`   | 2    | the tool broke               |

Every handler takes `(input, ctx)`. The input comes first, and `ctx` holds what this handler may use. Here that is `refuse`. `run` returns either its answer or a refusal, and `.at()` names the field:

```ts
run: ({ name, lang, style }, { refuse }) => {
  const l = byCode(lang);
  if (l === undefined)
    throw new RefusalError({
      kind: 'bug',
      step: 'greet',
      reason: `no language ${lang}, though adx checked it against its list`,
      next: 'report the bug to the maintainer of hello',
      state: 'Nothing was greeted.',
    });
  if (style === 'formal' && l.formal === undefined)
    return refuse(noFormal.at('style', `${l.name} has no formal greeting`));
  const word = style === 'formal' ? l.formal : l.hello;
  return { greeting: `${word}, ${name}!` };
},
```

```console
$ hello greet --name Ada --lang eo --style formal | jq -c '.kind, .issues[0].message'
"fix"
"Esperanto has no formal greeting"
```

- The field is checked. A refusal at `'styl'` does not compile, and the compiler reports it on the line of the typo.
- The second argument of `.at()` is the message. Without it, the message repeats the hint of the code.
- adx refused an unknown `lang` before `run`, since `lang` has a source. The compiler cannot know that, so the code throws in the branch adx has ruled out. It throws a `RefusalError` of kind `bug` from `@honeyglass/utils`, never a bare `Error`, so the answer says who acts next: exit 2, kind `bug`.
- A refusal that concerns no field, such as an account that is switched off, uses `.issue(message)` in place of `.at()`. It has no `path`. The [tracker](#wrapping-a-remote-api) shows one.
- A field that holds a list or an object can be refused at one part of it. `.at()` then takes a list that starts with the field. [Input that has parts](#input-that-has-parts) shows it.

When a code is raised at a field that has a source, adx fills in `command` for you: the call that lists the field's values. [Commands adx names](#6-what-every-tool-gets) says what such a command carries.

For a rule the schema cannot say, or one across several fields, give the command a `check`. It returns every issue at once. All three kinds of command take it:

```ts
const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');
```

```ts
check: ({ name }) => (name.trim() === '' ? [blankName.at('name')] : []),
```

adx checks in layers: the arguments, then the schema, then each value against its list, then your `check`, then your handler. Each layer collects all its issues, and a later layer runs only when the earlier ones passed.

Network and file system errors need no code of yours, and no `try`. adx sorts them into kinds (see [Errors you did not map](#6-what-every-tool-gets)).

### A command that returns a long list

A list can grow without end, and every line an agent reads takes space it needs for the task. So a `list` answers an outline: the few fields each item shows by default. The caller names more fields with `--fields`, and long lists come in pages.

```ts
const Language = z.object({
  code: id().describe('the language code, such as de'),
  name: z.string().describe('the language in English'),
  hello: z.string().describe('the casual greeting'),
  formal: z.string().optional().describe('the formal greeting'),
});
```

```ts
const languages = list({
  does: 'lists the languages hello speaks',
  item: Language,
  key: 'code',
  outline: ['name'],
  pageSize: 10,
  run: (_, { page }) => paged(LANGUAGES, page),
});
```

- `id()` is a name made of letters, digits, `-` and `_`. It is safe in a path and in a URL, and adx refuses anything else.
- `key` is the field that names an item. adx always puts it first in the outline.
- `outline` lists the further fields of the outline. Both name fields of `Language`: `outline: ['nmae']` does not compile.
- The `ctx` of a list holds `page`. `paged` cuts one page out of a whole array.
- A command without input, like `languages`, leaves out `input` and `example`.
- The constant of a list is named after what it lists, here `languages`, because `list` is already the function.

```console
$ hello languages | jq -c '.result.items[0], .result.total'
{"code":"ar","name":"Arabic"}
42
$ hello languages | jq -c '.next[]'
{"does":"the following page","command":"hello languages --page 10"}
{"does":"shows one language in full","command":"hello language","needs":["code"]}
```

The second step comes from the command that shows one item. `detailOf(languages)` is a source: it says that the field `code` takes a key of that list, and that this command shows one item in full.

```ts
const unknownLanguage = code('UNKNOWN_LANGUAGE', 'fix', 'Use a code the list answers');
```

```ts
const language = read({
  does: 'shows one language in full',
  input: z.object({ code: id().describe('the language code') }),
  example: { code: 'de' },
  values: { code: detailOf(languages) },
  run: ({ code }, { refuse }) => byCode(code) ?? refuse(unknownLanguage.at('code')),
});
```

Two facts adx checks at startup: a list whose outline hides a field needs exactly one such command, and every `id()` field needs a source. So every name in your tool has a command that lists the real names.

Name the fields you want, and each comes back whole:

```console
$ hello languages --fields code,formal | jq -c '.result.items[0]'
{"code":"ar","formal":"As-salamu alaykum"}
$ hello languages --fields | jq -c '[.result.values[].value]'
["code","name","hello","formal"]
```

`--page` takes the cursor the previous answer named. A handler that pages on its own server reads `page.cursor` and `page.size` and returns `{ items, next, total }`. A missing `next` ends the list. The [tracker](#wrapping-a-remote-api) does that.

### A command that changes something

An `effect` takes a function `plan`. It runs every check, stages the files to write, and answers what will happen. adx writes the staged files after `plan` returns. On a dry run adx writes nothing.

`hello` learns to remember friends and their language, one file per friend. The files lie in a root: a folder the tool may use. Declare it, and list it in the tool:

```ts
const home = root('home', envDir('HELLO_HOME'));
```

```ts
roots: [home],
```

`envDir` derives the place from the tool's name: `~/.hello`. Two helpers name a friend's file and the friends that exist:

```ts
const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);
```

```ts
const add = effect({
  does: 'remembers a friend',
  input: z.object({
    name: id().describe("the friend's short name"),
    lang: z.string().describe("the friend's language code"),
  }),
  example: { name: 'ada', lang: 'de' },
  values: { name: fresh(friendNames) },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});
```

The table lists the command in a group. A group is a table inside the table:

```ts
commands: {
  friends: { add },
},
```

- `files.write` stages one file and answers `{ file, bytes, replaces }`. That is also the answer of the command.
- `fresh` is the source for a new name. A new name has no list of valid values, but a list of names already taken. `fresh` answers those when `--name` comes without a value. It refuses nothing.
- The group makes the call `hello friends add`, and `hello friends` alone lists its actions.

```console
$ hello friends add --name ada --lang de --dry-run | jq -c '.applied, .result'
false
{"file":"friends/ada.json","bytes":26,"replaces":false}
$ hello friends add --name ada --lang de --dry-run | jq -r '.next[0].command'
hello friends add --name ada --lang de
```

```console
$ hello friends add --name ada --lang de
file      friends/ada.json
bytes     26
replaces  false
applied   true
```

The dry run and the real run answer the same fields. Only `applied` differs. adx gives `--dry-run` to every `effect`, for every combination of arguments, and it cannot be switched off. Commands made with `read` and `list` refuse it like any unknown option.

The same call again is refused, because the file now exists. Whether a file is replaced is decided by the write alone. The refusal already comes in `plan`, so a dry run shows it too:

```console
$ hello friends add --name ada --lang en | jq -c '.issues[0] | {code, hint}'
{"code":"ALREADY_EXISTS","hint":"add --replace to overwrite friends/ada.json"}
$ hello friends add --name ada --lang en | jq -r '.issues[0].command'
hello friends add --name ada --lang en --replace --dry-run
```

The command is a dry run. It shows what the replacement changes, before anything is overwritten:

```console
$ hello friends add --name ada --lang en --replace --dry-run
file      friends/ada.json
bytes     26
replaces  true
changes   changed: lang
applied   false
next      hello friends add --name ada --lang en --replace
```

Without `--dry-run` the same call replaces the file. Whether an agent may overwrite the person's data is for its skill to say. Most skills ask the person first.

Every effect takes `--replace`. A call with `--replace` to a new name passes. A call with `--replace` whose plan stages no `files.write` is refused with `UNKNOWN_OPTION`. An effect that never replaces a file switches the option off with `replace: false`. `schema` then does not list it. If such a command still writes over an existing file, the hint is "pick another name", never "add --replace". A file the tool builds again from its data needs no `--replace` at all: see [A file the tool builds again](#a-file-the-tool-builds-again).

An effect that sends something, such as a request to a server, adds a second function, `apply`. On a dry run only `plan` runs. The [tracker](#wrapping-a-remote-api) shows it.

### Next steps

A success can name what follows. A step comes from a command handle and a partial input, so it can only name a real command, with fields that command has. `next` gets the answer and the input:

```ts
next: (_, friend) => [greet.step({ lang: friend.lang })],
```

```console
$ hello friends add --name bob --lang de | jq -c '.next[0]'
{"does":"greets one person","command":"hello greet --lang de","needs":["name"]}
```

- adx derives `needs`: the required fields of `greet` that the step leaves open.
- You write `.needs('style')` only for an optional field the step still needs. It takes fields of the target command: `.needs('nmae')` does not compile.
- adx quotes every value for the shell.
- `next` runs only after a real run. A dry run answers the step that runs the same call for real.

Let the steps follow the facts of the answer, and return none when nothing follows. A step for the person, such as an upload by hand, is `tell('upload the file in the web console')`: it has a `does` and no `command`.

An issue can carry a step too. `.command()` adds a command that helps. Here the issue of `greet` points at the language:

```ts
.command(language.step({ code: l.code })),
```

```console
$ hello greet --name Ada --lang eo --style formal | jq -r '.issues[0].command'
hello language --code eo
```

`language` is declared further down the file than `greet`. That is fine, since `run` only uses it when it runs.

The first steps of the tool itself come from `start`, a property of the tool. The commands stand above the tool, so `start` can name them, and it can read the data folder:

```ts
start: async () => {
  const friends = await friendNames();
  return friends.length === 0 ? [add.step()] : [greet.step()];
},
```

With no friend stored yet, the first step creates one:

```console
$ hello | jq -c '.next[0]'
{"does":"remembers a friend","command":"hello friends add","needs":["name","lang"]}
```

Without `start`, the start answer names the commands and the step to `schema`.

### The tool explains itself

A tool built on adx holds no guide text and no free help text. An agent learns it from four answers, all made from your declarations:

- The tool alone names its commands and the first steps (`start`).
- `hello schema` names every command, every code with its kind and hint, and what each kind asks the caller to do.
- Every success names its next steps.
- Every refusal names the fix, and a command that helps.

```console
$ hello schema | jq -c '.result.kinds.ask, .result.codes[0]'
{"exit":1,"does":"only the person can solve it: stop and ask"}
{"code":"UNKNOWN_COMMAND","kind":"fix","hint":"Use a command the tool lists"}
```

What is no step belongs in an agent skill: when to use the tool, the flow of a typical task, when to stop and ask the person. A skill is a Markdown manual for agents. It is the one Agent DX rule adx does not build in: the skill is yours, and the tool never opens, embeds or prints it.

A tool can name its skill with `skill`, a path relative to the folder of its `package.json`. This is the tool of this chapter in full. `count` is one more command of the group `friends`: it counts the friends.

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

```console
$ hello | jq -c '.result | {name, skill}'
{"name":"hello","skill":"/Users/ada/src/hello/SKILL.md"}
```

Without `skill`, the start answer shows `"skill": null`, and nothing is checked. With it, the test kit reads the start of the file and checks two facts: the file exists, and it is a skill, which means it starts with a frontmatter that has `name` and `description`:

```markdown
---
name: hello
description: Greets people in their language. Use it when the user wants a greeting.
---
```

The kit does not read the commands, options or codes in the file. If you want a test that checks the manual against the tool, write it yourself.

## 4. The data folder

A tool stores data so that a later call finds it again. That can be the next command, a new session or the person. For an agent the data folder is often the only thing that lasts from one session to the next: it holds saved queries, templates or profiles.

Many tools need no data folder. A linter reads code and answers. A tool that only asks a server keeps its data on the server. Leave the data folder out when your tool stores nothing for later.

### Where the folder lies

The folder is a root from `envDir`, declared once and listed in `roots`:

```ts
const home = root('home', envDir('HELLO_HOME'));
```

- adx derives the place from the tool's name: `hello` keeps its data in `~/.hello`. `~` is the home folder on every system, so on Windows the folder is `C:\Users\<name>\.hello`.
- A second argument sets a location of its own, such as `envDir('NOTES_HOME', '~/notes')`.
- adx does not split settings from data on its own, and it reads no `XDG_*` variable and no `%APPDATA%`.
- The default folder may be missing. It then counts as empty. A read and a dry run create nothing. The first real write creates the folder.
- A root must stand in `roots`. `schema` then lists it, and the test kit can point it at a scratch folder.

### Moving the folder

The folder can be moved in two ways: by the variable the root names, here `HELLO_HOME`, and by an option named after the root, here `--home`. Every command of the tool takes the option, and it cannot be switched off. If both are given, the option wins.

When the folder is not the default one, adx carries it into every command it names, in a next step and in an issue. It does so whether the variable or the option set it:

```console
$ HELLO_HOME=/tmp/h hello friends add --name eve --lang de | jq -r '.next[0].command'
hello greet --lang de --home /tmp/h
```

The reason: many agents run each command in a new shell, and a variable does not survive from one shell call to the next. Without the option, a named command followed word for word would land in the real data.

A folder named by the variable or the option must exist, as an absolute path or with `~`. An empty value, a relative path, a file and a missing folder are refused with `ROOT_NOT_FOUND`, kind `ask`. adx never falls back to `~/.hello`.

```console
$ HELLO_HOME= hello friends add --name | jq -r '.issues[0].code'
ROOT_NOT_FOUND
$ hello friends add --name --home /tmp/nope | jq -r '.issues[0].code'
ROOT_NOT_FOUND
```

### Changing a file with `files.update`

Some commands exist to change a file: an edit, an update, an append. They use `files.update`. It takes the file, a size limit for the read, and a function from the old text to the new one:

```ts
const friendChoices = async () => (await friendNames()).map(name => ({ value: name }));
```

`friends edit` takes the same input as `friends add`. Four commands of this chapter read that schema, so it now has a name:

```ts
const FriendIn = z.object({
  name: id().describe("the friend's short name"),
  lang: z.string().describe("the friend's language code"),
});
```

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

- adx reads the file itself and calls your function with its text. `LIMIT` is your own number, such as 65,536: the read stops at that size.
- `files.update` takes no `--replace`, so the command says `replace: false`.
- It never creates a file. If the file is missing, adx refuses with `FILE_NOT_FOUND`, kind `fix`.
- As with `write`, the refusal comes in `plan`, the answer shows what changes, and a dry run writes nothing.

```console
$ hello friends edit --name ada --lang en --dry-run | jq -c '.result.changes.changed'
["lang"]
```

Which of the two a command uses follows from its purpose:

| The command             | Use            |
| :---------------------- | :------------- |
| adds, creates, saves    | `files.write`  |
| edits, updates, appends | `files.update` |

Known CLIs make the same split: `docker context create` and `docker context update`, `gh alias set` with `--clobber`, `git config` with `--append` and `--replace-all`.

### A file the tool builds again

Some files are derived: the tool builds them again from what it stores, such as an export or a built document. Every call writes such a file anew. A `--replace` that every call needs is added without a thought, and then it guards nothing.

`friends export` writes the names of all friends into a file for others to read. The command says `replace: 'always'`:

```ts
replace: 'always',
plan: async ({ file }, { files }) => {
  const names = (await friendNames()).join('\n');
  return files.write(file, names, { mode: 0o644 });
},
```

- Every `files.write` of the command replaces an existing file without `--replace`. The answer says so, as for every replace: `replaces: true`, and `changes`. A dry run answers the same, before the file is touched.
- The command is the only place that says it. `files.write` takes no option for it, and `schema` reads the same line.
- The command takes no `--replace`, as with `replace: false`.
- It covers every file the command writes. A command that writes a derived file and a kept file in one call cannot use it: cut it into two commands, or leave it behind `--replace`.
- It is for derived files only. Data that someone keeps, such as a friend, stays behind `--replace`.

```console
$ hello friends export --file public/friends.txt | jq -c '.result | {file, replaces}'
{"file":"public/friends.txt","replaces":true}
$ hello schema friends export | jq -c '.result.replace'
"always"
```

`mode` is explained under [Files](#6-what-every-tool-gets).

### Reading a file

`home.file(...)` answers a `File`. It has `rel`, `exists`, `text(limit)`, `bytes(limit)` and `json(limit, schema)`. Every read takes a limit and stops there, and `json` checks the content against the schema:

```ts
run: ({ name }) => friendFile(name).json(LIMIT, FriendIn),
```

A path stays inside its root and follows no link out of it.

### No secrets

adx stores no secrets. A tool reads a token from an environment variable it declares, such as `bearer('TRACKER_TOKEN')`. `schema` names the variable, never its value. A missing variable is a refusal of kind `ask`: only the person can supply a token. adx has no keychain and no `login` command.

### What is not covered yet

adx cannot delete a stored file yet, and it does not coordinate two calls that write the same file at the same moment. [Known limits](#8-known-limits) says what that means for a tool.

[Files](#6-what-every-tool-gets) in the reference has the details: file modes and the list of changes. [Stored data that changes its format](#stored-data-that-changes-its-format) shows how a newer tool reads older files.

## 5. Advanced

Each use case below is a whole tool, shown piece by piece.

### Wrapping a remote API

`tracker` reads and files tickets in a ticket tracker over its JSON API. Most calls work on one project, here `checkout-web`.

Four new parts appear:

- **A remote**: `remote()` binds the tool to one host. Your code reads through it with `get`, and each answer passes a Zod schema before your code sees it. A request that changes something is built with `post` and sent only by `act.send` in `apply`, so a dry run cannot send it.
- **A global input**: `global()` declares input that every command shares, such as the project. adx carries it into every command it names.
- **A long list as a source**: `detailOf` and `keyOf` point a field at `ticket list`, since ticket keys are too many to print.
- **Folders**: `tracker` has seven commands, too many to read in one file. It is cut by feature, and one file holds the tool.

**The layout.** adx reads no folder name, no file name and no order of imports. A command is a value, and the table of the tool takes it from wherever it lies. So the cut is yours. This one keeps a simple rule: a feature folder imports only from `core/` and from itself, and only `cli/` puts features together.

```text
tracker/
├── bin/tracker.ts          the program: runs the tool
├── cli/tracker.ts          the tool and the table of its commands
├── tickets/                one feature
│   ├── ticket.schema.ts    the schema five commands read
│   ├── list.ts             ticket list
│   ├── show.ts             ticket show
│   ├── create.ts           ticket create
│   ├── schedule.ts         ticket schedule
│   ├── close.ts            ticket close
│   └── stats.ts            stats
├── user/whoami.ts          a second feature: whoami
├── core/tracker.ts         what features share: the server and the project
└── tests/tracker.test.ts   the tests
```

**What the features share** lies in `core/tracker.ts`. First the remote, with the variable for its address and the variable for its token:

```ts
export const api = remote('tracker', {
  url: envUrl('TRACKER_URL', 'https://tracker.example.com/api'),
  auth: bearer('TRACKER_TOKEN'),
});
```

Then the global input. `global()` declares it once and answers the three kinds of command, with the project typed into every handler. The features take `read`, `list` and `effect` from here, not from adx:

```ts
export const project = global({
  input: z.object({
    project: id().describe('the project key, such as checkout-web'),
  }),
  example: { project: 'checkout-web' },
  values: { project: projects },
});

// read, list and effect, with the project typed into every handler
export const { read, list, effect } = project;
```

`projects` is the source of the project's values. It asks the server and answers choices:

```ts
export const Named = z.array(z.object({ name: z.string(), description: z.string().default('') }));

const projects = async () =>
  (await api.get(['projects'], Named)).map(p => ({
    value: p.name,
    does: p.description,
  }));
```

**What the server answers** for a ticket is a schema that five commands read. So it has a name and a file of its own in the feature, `tickets/ticket.schema.ts`:

```ts
export const Ticket = z.object({
  id: id().describe('the ticket key, such as CW-112'),
  title: z.string().describe('the one-line title'),
  state: z.enum(['open', 'closed']).describe('open or closed'),
  labels: z.array(z.string()).describe('the labels'),
  body: multiline().describe('the description, Markdown'),
});
```

**The list**, in `tickets/list.ts`. The server pages, and the handler passes its cursor through. `project` stands in the input beside the command's own fields. Only this command reads the schema of a page, so it stands in this file:

```ts
const TicketPage = z.object({
  items: z.array(Ticket),
  next: z.string().optional(),
  total: z.number(),
});
```

```ts
export const tickets = list({
  does: 'lists the tickets of a project',
  input: z.object({
    state: z.enum(['open', 'closed']).default('open').describe('open or closed'),
  }),
  item: Ticket,
  key: 'id',
  outline: ['title', 'state'],
  run: ({ project, state }, { page }) => {
    const query = { state, cursor: page.cursor, limit: page.size };
    return api.get(['projects', project, 'tickets'], TicketPage, { query });
  },
});
```

The constant is `tickets`, after what the command lists. The table of the tool gives the command its word, `list`.

**The command that shows one ticket**, in `tickets/show.ts`:

```ts
const noTicket = code('TICKET_NOT_FOUND', 'fix', 'Use a key the list command answers');
```

```ts
export const show = read({
  does: 'shows one ticket in full',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: detailOf(tickets) },
  output: Ticket,
  run: async ({ project, id }, { refuse }) => {
    const path = ['projects', project, 'tickets', id];
    const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
    return ticket ?? refuse(noTicket.at('id', `${project} has no ticket ${id}`));
  },
});
```

- A path is an array of segments, and adx encodes each one. A value can never add a `/` or a `?` to the address.
- `on` maps a status to the value `get` answers for it. With `{ 404: undefined }` the answer is a ticket or `undefined`. Any other status can stand there too, such as a 409. Without `on`, a 404 is a failure like any other.
- `output` is the schema of the answer. A ticket can be long, so the command declares it: the caller can then cut the answer with `--fields`, and `schema` shows the shape. `run` must answer what `output` declares.

**The command that files a ticket**, in `tickets/create.ts`. It sends, so it has `apply` beside `plan`:

```ts
export const create = effect({
  does: 'files a new ticket',
  input: z.object({
    title: z.string().describe('the one-line title'),
    body: multiline().default('').describe('the description, Markdown'),
    label: z.array(z.string()).default([]).describe('a label; may repeat'),
  }),
  example: { title: 'Pay button overlaps the footer', label: ['bug'] },
  values: {
    label: async ({ project }) => {
      if (project === undefined) return needs('project');
      const all = await api.get(['projects', project, 'labels'], Named);
      return all.map(l => ({ value: l.name, does: l.description }));
    },
  },
  replace: false,
  plan: ({ project, title, label }) => ({ project, title, labels: label }),
  apply: async ({ project, title, body, label }, { act }) => {
    const data = { title, body, labels: label };
    const request = api.post(['projects', project, 'tickets'], data);
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => tickets.step(),
  next: ({ ticket }) => [show.step({ id: ticket.id })],
});
```

- The labels belong to a project, so their source needs the project first and says so with `needs`. The source stands in `values`, and adx types its input from the command: `project` is a string or `undefined`, and `needs('projekt')` does not compile.
- `plan` answers what will be sent. That is the answer of the dry run.
- `apply` returns only what the real run adds. adx answers `{ ...planned, ...applied }`: everything the dry run answered, plus `ticket`. So an agent that read the dry run can read the real answer with the same code.
- `act` exists only in the `ctx` of `apply`, and adx never calls `apply` on a dry run. `act` only sends. Files are staged in `plan`, so no refusal for a file can come after a send.
- `next` gets the merged answer, so `ticket` is there without a check.
- `look` is the step adx names when it cannot know what a failed call left. adx refuses to start when a command has `apply` and no `look`.
- `replace: false`: this command writes no file, so it takes no `--replace`.

**The tool**, in `cli/tracker.ts`, is the only file that sees every feature:

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

- `global: project` gives every command the option `--project`. A command made without the global input does not compile in this table.
- A key of `commands` is one word of the call, and a table inside the table is a group: `tracker ticket list`, `tracker ticket show`, `tracker whoami`.
- A folder and a word are independent. `stats.ts` lies in `tickets/`, and its call is `tracker stats`.
- `next` and `after` are shown at the end of this section, under "A step across folders".

And `bin/tracker.ts` is the whole program:

```ts
import { tracker } from '../cli/tracker.ts';

await tracker.main();
```

The token comes from `TRACKER_TOKEN`. The person sets it, and `tracker schema` names the variable, never its value. A test points `TRACKER_URL` at a fake server.

**Listing tickets.** The outline holds the key and the two fields the list named:

```console
$ tracker ticket list --project checkout-web | jq -c '.result.items[0], .result.total'
{"id":"CW-131","title":"Coupon field accepts expired codes","state":"open"}
73
$ tracker ticket list --project checkout-web | jq -r '.next[].command'
tracker ticket list --project checkout-web --page eyJvIjo1MH0
tracker ticket show --project checkout-web
```

The second step still needs the key: its `needs` is `["id"]`.

**One ticket, cut to two fields.** `ticket show` has an `output`, so it takes `--fields`:

```console
$ tracker ticket show --project checkout-web --id CW-131 --fields title,state | jq -c '.result'
{"title":"Coupon field accepts expired codes","state":"open"}
```

**A key that does not exist.** Your code only refused with `TICKET_NOT_FOUND` at `id`. Because `id` has a source, adx adds the list command, with the project of the call:

```console
$ tracker ticket show --project checkout-web --id CW-999 | jq -c '.issues[0] | {code, command}'
{"code":"TICKET_NOT_FOUND","command":"tracker ticket list --project checkout-web"}
```

`tracker ticket show --project checkout-web --id`, with the key left empty, answers the same `command` with the code `MISSING_VALUE`. 73 keys are too many to print, so adx points at the list.

**Labels need the project first.** The label source returned `needs('project')`. adx refuses with one issue `MISSING_VALUE` at the missing field, and its `command` lists the values:

```console
$ tracker ticket create --label | jq -c '.issues[] | {code, path, command}'
{"code":"MISSING_VALUE","path":"project","command":"tracker ticket create --project"}
$ tracker ticket create --project checkout-web --label | jq -c '[.result.values[].value]'
["bug","checkout","design","payments"]
```

**Creating a ticket.** The dry run checks the labels against the server, and sends nothing. The real run answers the same fields and adds the ticket:

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' --label bug --dry-run | jq -c '.applied, .result'
false
{"project":"checkout-web","title":"Totals round twice","labels":["bug"]}
$ tracker ticket create --project checkout-web --title 'Totals round twice' --label bug | jq -c '.result | keys'
["labels","project","ticket","title"]
```

The step of the dry run is the same call without `--dry-run`, with the title in quotes. The step of the real run is `tracker ticket show --project checkout-web --id CW-132`.

**A busy server.** You mapped no status. adx tries a read again up to 3 times, with a growing pause, on a network error, a 429 or a 503. If the server stays busy:

```console
$ tracker ticket list --project checkout-web | jq -c '{kind, state, code: .issues[0].code}'
{"kind":"retry","state":"Nothing was changed.","code":"SERVER_BUSY"}
```

**A send is never tried again by adx.** The connection drops after `ticket create` sent its request. adx cannot know whether the ticket exists, says so, and names the `look` step:

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' | jq -r '.kind, .state'
retry
Sent without an answer, may have taken effect: the new ticket.
$ tracker ticket create --project checkout-web --title 'Totals round twice' | jq -r '.issues[0].command'
tracker ticket list --project checkout-web
```

The label you gave `act.send`, "the new ticket", is how `state` names the request. A command that sends several requests gets each one listed as answered, refused, or sent without an answer.

**A server that answers something else.** If the server drops a field, or sends `"state": "archived"`, the answer fails the `Ticket` schema. adx refuses with `REMOTE_REFUSED`, kind `ask`, and the schema's issues in the message. Your code never sees the bad value.

**No token.** Without `TRACKER_TOKEN`, every call that reaches the server is refused with `ENV_MISSING`, kind `ask`.

**A list that needs two fields.** The milestones of `tracker` belong to a team of a project. Their source stands in `tickets/schedule.ts`. It has a name, so it says which fields it reads, with adx's type `Source`. It names every field that is surely missing at that point:

```ts
const milestones: Source<{ project: string; team: string }> = async ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  const path = ['projects', project, 'teams', team, 'milestones'];
  return (await api.get(path, Named)).map(m => ({ value: m.name }));
};
```

`ticket schedule` puts a ticket into a milestone. Its input has the fields `id`, `team` and `milestone`. `keyOf(tickets)` says that `id` takes a key of the list. Unlike `detailOf`, it does not make this the command that shows one item. `team` has a named source too, `teams`:

```ts
values: { id: keyOf(tickets), team: teams, milestone: milestones },
```

It sends like `ticket create`. Its `look` is a function of the input, so it can name the item: after a dropped connection, the step is `tracker ticket show` with the key of the call.

```ts
look: ({ id }) => show.step({ id }),
```

adx answers all missing fields at once, one issue per field. The agent saves one call per field:

```console
$ tracker ticket schedule --milestone | jq -c '.issues[] | {path, command}'
{"path":"project","command":"tracker ticket schedule --project"}
{"path":"team","command":null}
$ tracker ticket schedule --milestone | jq -r '.issues[1].hint'
Give --project first: the teams depend on it
```

adx asks the source of each missing field what that source needs in turn. The teams need the project, which is missing too. So the second issue has no `command`: adx names a command only when it runs as it stands. Once the project is given, the issue for `team` names `tracker ticket schedule --project checkout-web --team`.

Name only what is surely missing. Whether a second field is needed can depend on the value of the first: if only some projects had teams, the source would return `needs('project')` first. `needs` takes fields the source reads: `needs('tema')` does not compile, and the compiler reports it at the source.

**A command without the project.** `global` holds for every command, and one command can deviate. `whoami`, in `user/whoami.ts`, takes no global field. It has no input at all, so its refusal concerns no field and uses `.issue()`:

```ts
const inactive = code('USER_INACTIVE', 'ask', 'Ask an admin to activate the account');
```

```ts
export const whoami = read({
  does: 'names the signed-in user',
  global: false,
  run: async (_, { refuse }) => {
    const user = await api.get(['user'], z.object({ login: z.string(), active: z.boolean() }));
    return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
  },
});
```

```console
$ tracker whoami | jq -c '.result'
{"login":"ada","active":true}
$ tracker whoami --project checkout-web | jq -r '.issues[0].code'
UNKNOWN_OPTION
```

Reading `project` in that `run` does not compile. A command can also make a global field optional, as `stats` does, which counts the tickets of one project or of all. `run` then sees `string | undefined`:

```ts
global: { project: 'optional' },
```

`tracker schema <command>` shows whether a command takes the option, and adx carries the value only into steps to commands that have it.

**A step across folders.** A good step after `whoami` is the list of tickets. But `whoami` lies in `user/`, the list lies in `tickets/`, and by the rule of this layout one feature does not import another. So the step stands where the features meet: at the tool, with `after`.

```ts
next: [after(whoami, () => [tickets.step()])],
```

```console
$ tracker whoami | jq -c '.next[0]'
{"does":"lists the tickets of a project","command":"tracker ticket list","needs":["project"]}
```

- A `next` whose steps stay in the command's own folder stands at the command, as in `ticket create`. A `next` to a command of another folder stands at the tool.
- `after` takes a command and a function like `next`. The function gets the answer of the real run and the input, both typed by the command.
- Its steps follow the steps of the command's own `next`.
- An `after` for a command the tool does not list is a `DECLARATION` error at startup.
- In a larger tool the list of `next` gets a file of its own in `cli/`.

**A hint across folders.** The command of an issue has the same limit. `.command(step)` stands in the handler, so it names a command of the handler's own folder. `tracker` needs no more than that. A larger tool does. Say a tool that releases apps refuses a frozen environment with one code, `ENV_FROZEN`, from two features. The code lies in `core/`, and the command that helps, the list of environments, lies in the feature `env/`. Neither `core/` nor the other feature may import it. So the command stands at the tool, with `hint`, in a list of its own in `cli/`:

```ts
export const hints = [
  // core/ to env/: the list of environments shows which are frozen
  hint(frozen, () => envs.step()),
];
```

The tool takes the list as `hints`, beside `next`.

- `hint` takes a code and a function that answers one step to a command. adx adds that command to every issue of the code.
- A `.command(step)` at the issue wins over the hint. The hint wins over the command adx derives from the source of the field.
- The function gets nothing, so adx calls it at startup. A hint for a command the tool does not list is a `DECLARATION` error, and so is a second hint for one code.
- A step from `tell` does not compile here: the `command` of an issue is a command.

### A checker over a codebase

`lintkit` checks the Go files of a folder against house rules. It only reads, and its answer grows with the code: 47 findings in one package is normal. Two new parts:

- **A root from a marker**: `marker('go.mod')` is the nearest folder at or above the working directory that holds a `go.mod`. It follows the working directory, so it has no variable and no option.
- **Path schemas**: `dir(root)` is a Zod schema for a folder inside a root. The caller writes a path, and `run` gets a `Dir`. `walk` visits every regular file below it in sorted order, and `text` stops at the limit you give.

```ts
const gomod = root('module', marker('go.mod'));
```

`Finding` is the Zod schema of one finding. Its fields are `id`, `rule`, `file`, `line`, `message` and `source`, the lines around the finding. One function reads the files and collects the findings:

```ts
const SOURCE_BYTES = 1_048_576; // no Go file of ours is larger than 1 MiB

async function findAll(folder: Dir, only: readonly string[]) {
  const all: z.output<typeof Finding>[] = [];
  for await (const file of folder.walk('.go')) {
    const source = await file.text(SOURCE_BYTES);
    all.push(...check(file.rel, source, only));
  }
  return all;
}
```

`check` and `RULES` come from `rules.ts`, your own module. `RULES` is the list of rule names, `as const`, and `check` builds each finding, with an id hashed from rule, file and line. A file that is too large, or a link that leads out of the module, makes `file.text` or `walk` throw adx's own refusal, which already names the file. You do not catch it.

The list, with a rule across two fields in `check` and a step of its own in `next`:

```ts
const noRule = code('NO_RULE', 'fix', 'Name a rule, or leave --strict out');
const noFinding = code('FINDING_NOT_FOUND', 'fix', 'Run the check again and use an id it lists');
```

```ts
const findings = list({
  does: 'checks the Go files of a folder',
  input: z.object({
    dir: dir(gomod).describe('the folder to check'),
    rule: z.array(z.enum(RULES)).default([]).describe('a rule; may repeat'),
    strict: z.boolean().default(false).describe('refuse a check of all rules'),
  }),
  example: { dir: '.' },
  item: Finding,
  key: 'id',
  outline: ['rule', 'file', 'line'],
  check: ({ rule, strict }) => (strict && rule.length === 0 ? [noRule.at('rule')] : []),
  run: async ({ dir, rule }, { page }) => paged(await findAll(dir, rule), page),
  next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : []),
});
```

A list's own steps come after the ones adx derives: the following page and the call for one item. With no finding, nothing follows, so the list names no step of its own.

The command `finding` shows one finding in full, as `language` does in `hello`. Its `id` takes a key of the check:

```ts
values: { id: detailOf(findings) },
```

The tool lists both. The constant of the list is `findings`, and its word is `check`:

```ts
export const lintkit = tool({
  name: 'lintkit',
  version: '0.4.0',
  does: 'checks Go files against house rules',
  roots: [gomod],
  commands: { check: findings, finding },
});
```

**Checking one package.** The outline keeps 47 findings to a few fields each:

```console
$ cd ~/src/shop
$ lintkit check --dir ./internal/billing | jq -c '.result.items[0], .result.total'
{"id":"f-7c2e91","rule":"error-wrap","file":"internal/billing/invoice.go","line":41}
47
$ lintkit check --dir ./internal/billing | jq -r '.next[] | .command // .does'
lintkit finding --dir internal/billing
fix the findings, then check again
```

All 47 fit the default page of 50, so there is no step to a following page. The one-item step still needs the id, and it carries `--dir`, because `finding` has a field of the same name. The folder comes back as `internal/billing`: adx cleans every path and shows it relative to the root, so `./internal/billing` and `internal/billing` are the same value everywhere.

**One finding in full**, with its source lines:

```console
$ lintkit finding --dir internal/billing --id f-7c2e91 | jq -r '.result.source'
39	if err != nil {
40		log.Print(err)
41		return fmt.Errorf("charge failed: %v", err)
```

**Paths outside the module** are refused before your code runs:

```console
$ lintkit check --dir ../secrets/key.go | jq -c '.issues[0] | {code, path}'
{"code":"PATH_OUTSIDE","path":"dir"}
```

From a folder with no `go.mod` above it, every call is refused with `ROOT_NOT_FOUND`, kind `ask`.

### Files the call names

`notes` keeps Markdown notes in a folder. Its root has a location of its own, `~/notes`. Here the caller names the file, so two more path schemas appear: `outFile(root)` for a file to write, and `inFile(root)` for a file to read, which must exist.

```ts
const home = root('home', envDir('NOTES_HOME', '~/notes'));
```

```ts
const NoteIn = z.object({
  file: outFile(home).describe('where the note goes, such as ideas/q3.md'),
  title: z.string().describe("the note's title"),
  text: multiline().describe('the note itself, Markdown'),
});
const sample = {
  file: 'ideas/q3.md',
  title: 'Q3 roadmap',
  text: '- ship saved carts',
};
```

```ts
const add = effect({
  does: 'stores one note',
  input: NoteIn,
  example: sample,
  plan: (note, { files }) => files.write(note.file, render(note)),
});
```

`render` is your own function: it answers the Markdown text of a note. Before your plan runs, adx checks the target: the path stays inside the root, and no folder stands where the file goes. Missing parent folders are created with the file.

A second `notes add` to the same file is refused with `ALREADY_EXISTS`, as in `hello`. The issue stands at the field that named the file, so its `path` is `file`. A path that leaves the folder, such as `--file ../.ssh/config`, is refused with `PATH_OUTSIDE`. A link already standing at the target is replaced by the write. adx never writes through a link.

`notes append` exists to change a file, so it uses `files.update`:

```ts
const append = effect({
  does: 'adds text to the end of a note',
  input: z.object({
    file: inFile(home).describe('the note to add to'),
    text: multiline().describe('the text to add, Markdown'),
  }),
  example: { file: 'ideas/q3.md', text: '- ship gift cards' },
  replace: false,
  plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
});
```

```console
$ notes append --file ideas/q3.md --text '- ship gift cards' --dry-run | jq -c '.result.changes.added'
["- ship gift cards"]
```

`outFile`, `inFile` and `home.file(...)` answer one type, `File`. So any file handle can be read with a limit, and staged.

**Several files.** Every file staged in one `plan` is written with the others, all or none. The command `add-indexed` stores the note and keeps an index, a file of the tool's own. The index is created by the first note and updated by the later ones, because `update` never creates a file. `indexWith` is your own function: it answers the index text with the line of the note.

```ts
plan: async (note, { files }) => {
  const index = home.file('index.md');
  return {
    note: files.write(note.file, render(note)),
    index: index.exists
      ? await files.update(index, LIMIT, old => indexWith(old, note))
      : files.write(index, indexWith('', note)),
  };
},
```

The table of `notes` lists both commands. `add` is a command, so it cannot be a group as well: the second command is one word, `add-indexed`. A key with a dash stands in quotes:

```ts
commands: { add, 'add-indexed': addIndexed, append, show },
```

adx writes every file whole beside its place, then renames them one after another. A crash or a full disk never leaves half a note. Two renames are not one atomic step, so if a later rename fails, `state` names the files already moved:

```console
$ notes add-indexed --file ideas/q4.md --title Q4 --text '- tbd' | jq -r '.state'
Moved in: ideas/q4.md. Not moved: index.md. No temporary file is left.
```

**A full disk.** The answer says what is left:

```console
$ notes add --file ideas/q5.md --title Q5 --text '- tbd' | jq -c '.kind, .state, .issues[0].code'
"ask"
"Nothing was changed. The temporary file was removed."
"SYSTEM_REFUSED"
```

The kind is `ask`: a full disk or a missing right is for the person to fix, not for the agent to retry.

### Input that has parts

`hello greet-all` greets several people in one call. Its input is a list of objects, so it goes in through `--json`. Two new parts:

- **A path below a field**: `.at()` takes a list in place of a field. The first part is the field, and each further part is a key or an index. So an issue names the one part that is wrong.
- **A shape**: a schema that a caller writes and no command takes whole. The tool registers it under a name, and `schema` prints it.

One person is such a shape. The command takes a list of them:

```ts
const Person = z.object({
  name: z.string().describe('who to greet'),
  lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
});

const twice = code('NAME_TWICE', 'fix', 'Name each person once');

const greetAll = read({
  does: 'greets several people',
  input: z.object({ people: z.array(Person).describe('the people to greet') }),
  example: { people: [{ name: 'Ada', lang: 'de' }] },
  check: ({ people }) =>
    people.flatMap((person, i) =>
      people.findIndex(p => p.name === person.name) < i
        ? [twice.at(['people', i, 'name'], `${person.name} is named twice`)]
        : [],
    ),
  run: ({ people }) => ({
    greetings: people.map(person => `${hellos[person.lang]}, ${person.name}!`),
  }),
});
```

The tool lists the shape in `shapes`, under the word that names it:

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  shapes: { person: Person },
  commands: { 'greet-all': greetAll },
});
```

**A name given twice.** The schema cannot say that rule, so `check` does, and it points at the second place the name stands:

```console
$ hello greet-all --json '{"people":[{"name":"Ada"},{"name":"Bob"},{"name":"Ada"}]}' | jq -c '.issues[0] | {code, path}'
{"code":"NAME_TWICE","path":"people.2.name"}
```

- The answer writes the path with dots. An index is a number in the list and in the path.
- The first part is checked like a flat path: `.at(['persons', 2, 'name'])` does not compile, in `check` and in `refuse`.
- The flat form stays. `.at('people')` is the issue at the field itself.
- When the field has a source, adx fills in `command` from it, as for a flat path.

**The shape in `schema`.** `hello schema` lists the shapes beside the commands, and `hello schema person` prints one as JSON Schema:

```console
$ hello schema | jq -c '.result.shapes'
["person"]
$ hello schema person | jq -c '.result.shape.required'
["name"]
```

**A part that fails its schema.** adx refuses it with `SCHEMA`, at the same kind of path. The part lies inside a shape, so the command of the issue shows that shape, not the whole input of the command:

```console
$ hello greet-all --json '{"people":[{"name":"Ada","lang":"xx"}]}' | jq -c '.issues[0] | {code, path, command}'
{"code":"SCHEMA","path":"people.0.lang","command":"hello schema person"}
```

- adx knows the part by the schema value: the same `Person` stands in `shapes` and in the input.
- The whole input of a command needs no shape. `hello schema greet-all` prints it already.
- A shape is also the place for a file that someone edits by hand, so that `schema` shows what the file may hold.
- A key of `shapes` is one word, and a shape and a command cannot share a word. That is a `DECLARATION` error at startup.
- The start answer does not list shapes and holds no data of the tool: it names the commands and the first steps. Data comes from a command.

### Stored data that changes its format

A tool changes, and with it the fields it stores. `hello` 0.2 stored one language per friend. `hello` 0.3 stores several. The person's folder then holds files of both formats.

`stored` gives one kind of stored data a format number. `.from` declares an older format and the step to the next one:

```ts
const FriendV1 = z.object({ name: id(), lang: z.string() });
const FriendV2 = z.object({ name: id(), langs: z.array(z.string()) });

const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));
```

List every kind in the tool. `hello schema` then shows the number each kind is written in, and the test kit checks it. A kind that is left out is a `DECLARATION` error at startup.

```ts
stored: [Friend],
```

Then read and write through the kind. `friends show` reads, and `friends learn` adds a language to a friend:

```ts
run: ({ name }) => friendFile(name).json(LIMIT, Friend),
```

```ts
plan: ({ name, lang }, { files }) =>
  files.update(friendFile(name), LIMIT, old => {
    const friend = Friend.parse(old);
    return Friend.stringify({ ...friend, langs: [...friend.langs, lang] });
  }),
```

- `Friend.stringify` writes `"version": 2` into the text. `Friend.parse` and `file.json` read it back. A file without the field is format 1.
- A read converts an older file in memory only. The next real write stores the new format.
- A file of a newer format is refused with `NEWER_VERSION`, kind `ask`. So an old tool never writes a file back without the fields it does not know.
- A file that fails its schema is refused with `STORED_INVALID`, kind `ask`. adx never guesses.

```console
$ cat ~/.hello/friends/ada.json
{"name":"ada","lang":"de"}
$ hello friends show --name ada | jq -c '.result'
{"name":"ada","langs":["de"]}
$ hello friends learn --name ada --lang eo | jq -c '.applied'
true
$ cat ~/.hello/friends/ada.json
{"version":2,"name":"ada","langs":["de","eo"]}
```

The number counts the format of one kind of data, not the release of the tool:

- You raise it by hand, and only when the stored fields change.
- It never goes down and is never given twice. A beta that changes the fields takes the next number too.
- Each kind has its own number. A change to a `template` kind leaves the `friend` files untouched.

With several older formats, name them from the newest down. Each step answers the format after it:

```ts
const Friend3 = stored('friend', 3, FriendV3)
  .from(2, FriendV2, old => ({ ...old, nick: old.name }))
  .from(1, FriendV1, old => ({ name: old.name, langs: [old.lang] }));
```

The test kit guards the number. On its first run it writes a fingerprint of every stored schema, per format number, into a file next to `package.json`. Check that file in. After that the kit only compares. When a schema changes and its number does not, the test fails:

```console
✖ hello keeps the agent rules > stored data
  friend: the schema changed, but its version is still 2.
  Raise it to 3 and add .from(2, ...) for the old files.
```

### Testing your tool

The test kit, `@honeyglass/adx/test`, probes every command of your tool for the behavior this guide describes: several mistakes in one call, each option left empty, unknown fields, a value outside each list, dry runs that change nothing, steps that run, hints that run. You give it what only you know: seed files, fake servers and variables. It runs on `node:test`, so nothing else needs installing.

Here is the test file for `tracker`, `tests/tracker.test.ts`. It imports the tool from `cli/`, and single commands from their feature:

```ts
import { tracker } from '../cli/tracker.ts';
import { api } from '../core/tracker.ts';
import { create } from '../tickets/create.ts';
import { tickets } from '../tickets/list.ts';
```

First the fake server, a table of routes:

```ts
const ticket = {
  id: 'CW-112',
  title: 'Totals round twice',
  state: 'open',
  labels: ['bug'],
  body: '',
};
const project = '/projects/checkout-web';
```

```ts
const routes = {
  'GET /user': { login: 'ada', active: true },
  'GET /stats': { open: 73, closed: 412 },
  [`GET ${project}/stats`]: { open: 73, closed: 412 },
  'GET /projects': [{ name: 'checkout-web' }],
  [`GET ${project}/labels`]: [{ name: 'bug' }, { name: 'payments' }],
  [`GET ${project}/teams`]: [{ name: 'web' }],
  [`GET ${project}/teams/web/milestones`]: [{ name: 'q3' }],
  [`GET ${project}/tickets`]: { items: [ticket], total: 1 },
  [`GET ${project}/tickets/CW-112`]: ticket,
  [`POST ${project}/tickets`]: { ...ticket, id: 'CW-132' },
  [`PATCH ${project}/tickets/CW-112`]: { ...ticket, state: 'closed' },
};
```

Then the samples and the tests. `conformance`, `fake` and `reply` are imports from `@honeyglass/adx/test`:

```ts
const samples = {
  env: { TRACKER_TOKEN: 'test-token' },
  fakes: [fake(api, routes)],
};

test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/tracker.ts'], samples));
```

```ts
test('a busy server is a retry', async () => {
  const busy = fake(api, { [`GET ${project}/tickets`]: reply(503) });
  const options = { ...samples, fakes: [busy] };
  const answer = await tickets.invoke({ project: 'checkout-web' }, options);
  assert.equal(answer.kind, 'retry');
  assert.equal(answer.issues?.[0]?.code, 'SERVER_BUSY');
  assert.equal(answer.state, 'Nothing was changed.');
});
```

The valid calls come from the examples of your commands, so the fake must answer them: `CW-112`, the label `bug`, the team `web` and the milestone `q3` appear in both places.

```console
$ node --test
▶ tracker keeps the agent rules
  ✔ raw JSON input
  ✔ schema at run time
  ✔ JSON when piped
  ✔ dry runs
  ✔ hints that run
  ...
✔ tracker keeps the agent rules (412ms)
✔ the program keeps them too (2.9s)
✔ a busy server is a retry (14ms)
```

**`conformance` with a tool** runs every probe in-process, each in a fresh scratch folder. It compares the folder before and after each call, so a dry run that wrote a file fails. The fake sits behind a recorder, so the kit sees that a dry run of `ticket create` sent no `POST`, and that a dropped connection during the real run is answered with the right `state`. The kit also watches stdout. A forgotten debug line fails the test:

```console
✖ JSON when piped
  tracker ticket create --project checkout-web --label wrote 33 bytes to stdout beside its answer:
  labels [ { name: 'bug', description: '' }, ... ]
```

**`conformance` with a command line** runs the same probes against the real program, started as a process in a fresh scratch folder for home, temp and working directory. It reads `tracker schema` and derives every call from it. So it also catches what only the process does, such as a write straight to `process.stdout`. It serves the fakes on a local port and points `TRACKER_URL` there. No build step comes first: Node runs `bin/tracker.ts` as it is.

**Named commands.** The kit splits every command the tool names, in a `next` step or in an issue, into shell words with `unbash`. It then checks that adx knows each call: the command, every option and every value. A step without `needs` must run as it stands.

**`invoke`** runs one command without argv or stdout, and answers the same object the tool prints. It is a method of the command handle, so its input is typed: `tickets.invoke({ projekt: 'checkout-web' })` does not compile. A command runs as part of its tool, so the test file imports the tool as well. Use it for the cases that only you know, such as a busy server. Its options take the samples, and `dryRun` and `replace` for the two options of an effect.

**A tool with a data folder** names a `seed`: a folder with the files the tool should find. The kit copies it into the scratch folder of every probe:

```ts
const samples = { seed: 'test/seed' }; // holds the friend ada

test('hello keeps the agent rules', t => conformance(t, hello, samples));

test('a taken name needs --replace', async () => {
  const friend = { name: 'ada', lang: 'en' };
  const refused = await add.invoke(friend, samples);
  assert.equal(refused.issues?.[0]?.code, 'ALREADY_EXISTS');
  const options = { ...samples, replace: true };
  const replaced = await add.invoke(friend, options);
  assert.equal(replaced.result?.replaces, true);
});
```

**`run`** runs one whole call in the process of the test, from the arguments to the exit code. It is one more import from `@honeyglass/adx/test`. Use it for what only a whole call shows: the text a person reads, input through stdin, a group called alone, the exit code. It answers `exit`, `out` and `err`, the exit code and what the call wrote to stdout and to stderr:

```ts
test('a person at a terminal reads text', async () => {
  const { exit, out } = await run(hello, ['greet', '--name', 'Ada'], { ...samples, tty: true });
  assert.equal(exit, 0);
  assert.equal(out, 'Hello, Ada!\n');
});

test('the input can come through stdin', async () => {
  const stdin = '{"name":"Ada","lang":"de"}';
  const { out } = await run(hello, ['greet', '--json', '-'], { ...samples, stdin });
  assert.equal(JSON.parse(out).result.greeting, 'Hallo, Ada!');
});
```

- Its options take the samples and the three things a call gets from its surroundings.
- `tty` says whether stdout is a terminal. `true` answers text. The default is `false`, so JSON.
- `stdin` is the text the call reads. The default is `null`: nothing is piped in.
- `cwd` is the working directory. The default is a fresh scratch folder.
- The data folder is a scratch folder with the seed copied in, as in every probe.
- `run` starts no program, so many calls cost little. It does not show what only the process does. `conformance` with a command line stays the test of the real program.

Four more checks run when the tool has their subject:

- **The skill.** If the tool names a `skill`, the file must exist and start with a frontmatter that has `name` and `description`.
- **Stored data.** Each schema of a `stored` kind must match the fingerprint checked in for its format number.
- **`--replace`.** An effect that lists `--replace` and stages no `files.write` in any probe fails, with the fix: add `replace: false`.
- **Large answers.** A `read` that answers a long list or a large document without `output` fails.

The same engine runs as a command, for CI or for a tool built by someone else on adx:

```console
$ pnpm exec adxcheck report --env TRACKER_TOKEN=test-token -- node bin/tracker.ts
Raw JSON input      met
Schema at run time  met
JSON when piped     met
Input hardening     met
Dry runs            not probed   no recorder for "tracker": pass a fake to probe sends
Agent skill         none named
...
Hints that run      not probed   TICKET_NOT_FOUND was never raised
```

`report` only reports and exits 0. `adxcheck run` refuses instead: any probed behavior that is not met is a refusal with exit 1, one issue per failed probe, each with the call that showed it.

"Not probed" is honest: the black box without a fake server cannot see whether a dry run sends, and a code no probe raised cannot prove its hint runs. Raise such codes in a test of your own. "None named" is honest too: the agent skill is yours, and adx does not count a tool without one as having met that rule.

## 6. What every tool gets

**Calls**

- `tool`: name, version, the path of the skill or `null`, the commands, and the first steps.
- `tool <group>`: the actions of the group.
- `tool schema`: every command, the shapes, the shared options, the four kinds, every code with its kind and hint, the roots with their variable and option, the variables, the stored kinds with their format number, the limits.
- `tool schema <command>`: the input schema, the global fields the command takes, the options it takes, which fields have lists, the key, fields and outline of a list, the fields of a `read` with `output`, the page size, `replace: 'always'` of an effect that replaces a derived file, the example.
- `tool schema <shape>`: one shape as JSON Schema.
- `tool <command> --help`: the same facts as text for people.
- `tool --version`: the version.

Routing and help come from adx's own command table, which the `commands` of your tool fill. There is no help text to write.

**Options**

- `--json '{...}'`, on every command: input as one object. `--json -` reads it from stdin.
- `--output text` or `--output json`, on every command: forces the form. Otherwise text at a terminal, JSON when piped.
- `--dry-run`, on every `effect`: runs `plan` only and answers `"applied": false`.
- `--replace`, on an `effect` without `replace: false` or `replace: 'always'`: allows `files.write` to replace an existing file.
- `--fields a,b`, on a `list` and on a `read` with `output`: the named fields, each whole. Alone, it lists the fields.
- `--page <cursor>`, on a `list`: the page the previous answer named.
- `--home <folder>`, on every command of a tool with such a root: moves the root. The option has the name of the root.
- `--<option>` alone, for a field with a list: lists its values, or names the command that does.

**How adx reads a call**

adx uses no CLI framework. It reads the arguments with Node's `util.parseArgs` in its lenient mode and checks every token itself:

- Command words come first, options after: `tracker ticket list --project checkout-web`.
- A field becomes an option of the same name, in kebab case: the field `dueDate` is `--due-date`.
- A boolean field is a switch: `--strict` sets it, and it takes no value. A number is parsed from its text.
- `--name=value` works like `--name value`. It is the way to give a value that starts with a dash.
- An option followed by another option counts as given without a value.
- An unknown option is collected, and reading goes on. All mistakes of a call come back in one answer.
- An option may come again only for an array field, such as `--label bug --label payments`.
- Options and `--json` fill one object. A field given by both is refused with `REPEATED_OPTION`.
- Objects and arrays of objects go in through `--json` only.
- A field must not take the name of an option adx gives its command. `json`, `output`, `dry-run`, `replace` and `help` are taken on every command, `page` on a `list`, and `fields` on a `list` and on a `read` with `output`. So an `effect` may name a field `page`. `version` is free on every command, since `--version` belongs to the tool called alone. A clash does not compile: the compiler reports it at `input`. A global field reaches every kind of command, so it takes none of these names.
- A field must not take the name of a root either, such as `home`. That is a `DECLARATION` error at startup. Rename the field, or the root.

**Commands adx names**

Every command in a step or in an issue is complete, so an agent can run it word for word:

- A step you write carries the fields you gave it.
- A command adx derives carries the fields of the call that the named command has under the same name. Derived commands are the list of a field's values, the following page and the one-item command of a list.
- Every named command carries the global fields the target takes, and the data folder when it is not the default one.
- Every value is quoted for the shell.

**The answer**

```json
{
  "ok": true,
  "applied": true,
  "result": {},
  "next": [{ "does": "...", "command": "...", "needs": ["..."] }]
}
```

```json
{
  "ok": false,
  "kind": "fix",
  "state": "Nothing was changed.",
  "issues": [{ "code": "...", "path": "...", "message": "...", "hint": "...", "command": "..." }]
}
```

`applied` appears only on commands that change something. The real run of an effect answers everything its dry run answered, plus what `apply` returned. A refusal holds issues only: `next` belongs to a success. The `path` of an issue is a field, or a place below it written with dots, such as `people.2.name`. An issue from `.issue()` has no `path`, and `command` stands only where a command helps. Exit codes: 0 success, 1 a refusal of kind `fix`, `ask` or `retry`, 2 kind `bug`.

**Files**

- A new file gets mode `0600`, and a folder adx creates gets `0700`. A replaced or updated file keeps the mode it had, so a person who opened a file to a group keeps that choice. On Windows the modes are not applied.
- A file that others must read names its own mode, which then holds on a replace too:

```ts
return files.write(file, names, { mode: 0o644 });
```

- `files.write` and `files.update` answer `{ file, bytes, replaces }`. When the file replaces one, adx adds `changes`:

```console
$ hello friends edit --name ada --lang en --dry-run | jq -c '.result.changes'
{"added":[],"changed":["lang"],"removed":[],"more":0}
```

- When the old and the new content are both JSON, the lists hold JSON paths, such as `langs.0`. For other content, they hold the lines added and removed.
- Each list holds at most 20 entries. `more` counts what that cap left out.
- A plan that can say it in the tool's own words returns its own `changes`, and adx keeps that one:

```ts
plan: async ({ name, lang }, { files }) => {
  const next = (old: string) => JSON.stringify({ ...JSON.parse(old), lang });
  const written = await files.update(friendFile(name), LIMIT, next);
  const changes = { added: [], changed: ['language'], removed: [], more: 0 };
  return { ...written, changes };
},
```

**adx's own codes**

`tool schema` prints this list in every tool, each code with its kind and hint.

- `fix`: `UNKNOWN_COMMAND`, `OPTION_BEFORE_COMMAND`, `UNKNOWN_OPTION`, `UNEXPECTED_ARGUMENT`, `UNEXPECTED_VALUE`, `REPEATED_OPTION`, `MISSING_VALUE`, `MISSING_INPUT`, `INVALID_JSON`, `INPUT_TOO_LARGE`, `SCHEMA`, `NOT_IN_LIST`, `PATH_OUTSIDE`, `FILE_NOT_FOUND`, `NOT_A_FILE`, `NOT_A_FOLDER`, `ALREADY_EXISTS`, `URL_NOT_ALLOWED`
- `ask`: `ROOT_NOT_FOUND`, `ENV_MISSING`, `SYSTEM_REFUSED`, `ACCESS_REFUSED`, `REMOTE_REFUSED`, `NEWER_VERSION`, `STORED_INVALID`
- `retry`: `NETWORK_FAILED`, `SERVER_BUSY`
- `bug`: `DECLARATION`, `UNKNOWN_ERROR`, `PANIC`

`SCHEMA` covers every problem with the shape of the input. Its `path` tells them apart. `MISSING_VALUE` stands at a field whose option came without a value and has no list to print, and at every field a list needs first. `DECLARATION` means the tool's own setup is wrong in a way the compiler cannot see, such as an `id()` field without a source, an example that fails a `.regex()`, an `apply` without `look`, or a step to a command that no tool lists. adx checks the setup at every start, so you see it on the first run.

**Errors you did not map**

- No connection, a timeout, or the status 408, 429, 502, 503 or 504: `NETWORK_FAILED` or `SERVER_BUSY`, kind `retry`.
- The status 401 or 403, or the token variable is not set: `ACCESS_REFUSED` or `ENV_MISSING`, kind `ask`.
- Any other status outside 2xx, or an answer that fails its schema: `REMOTE_REFUSED`, kind `ask`.
- A system error on a path, such as a full disk: `SYSTEM_REFUSED`, kind `ask`.
- Any other thrown error: `UNKNOWN_ERROR`, kind `bug`.

A read is tried again up to 3 times before it is refused, with a growing pause, on a network error, a 429 or a 503. A send is never tried again by adx: the agent gets kind `retry` and the `look` step. Every refusal keeps the error that led to it as its `cause`.

adx handles each of these errors inside itself, where the error starts. So a handler writes no `try` for anything that goes through adx: `api.get` answers a value, `files.update` hands over the text, and a failure ends the call with adx's refusal.

Your own code can fail in a way you expect too: a status of a send, a file you read yourself, a parser that throws. Take such an error as a value, with `$try` for a promise and `trySync$` for a synchronous call that can throw. Both are imports from `@honeyglass/utils/ts`. Check the error on the next line, answer with `refuse`, and throw on what you did not expect. `ticket close` of the tracker expects a 409 while someone else works on the ticket, and refuses with its code `STILL_OPEN`:

```ts
const sent = await $try(act.send('the closed ticket', request, Ticket));
if (sent.error === null) return { ticket: sent.data };
// The server answers 409 while someone else works on the ticket. Any other error flies on.
if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
throw sent.error;
```

- Write no native `try` block and no `.catch`.
- Put no `$try` around a bug, such as a typo in your own code. Let it fly.
- adx catches a bug once, in `main()`, and answers `UNKNOWN_ERROR`, kind `bug`, with exit code 2.

## 7. FAQ

**How does the type safety work?**
Each command's types come from its Zod schema. `run`, `plan` and `check` get `z.output` of the schema: defaults filled in, paths turned into `Dir` or `File`. `example`, `step()` and `invoke()` take `z.input`: what a caller writes, so a field with a default may be left out and a path is a string. Every place that names a field takes `keyof` of that type, so a typo is a compile error. The compiler cannot see values: an `id()` field without a source, an example that fails a `.regex()`, or a route in a fake server. adx checks the first two at startup. The test kit finds the third.

**Can I print to stdout?**
No. Return a value and let adx write it. Add `text` for the terminal form. Progress and logs go to stderr, for example with `console.error`. The test kit fails a forgotten `console.log`, because one extra line breaks every program that parses the answer.

**What if my effect is not a file or an HTTP request?**
Do it in `apply`, so a dry run skips it, and give the command a `look` step. If it fails, throw `failed(state, error)` with a sentence that says what the call left, such as `failed('The migration ran up to step 3.', error)`. adx sorts the error into a kind as it does for every error you did not map. For files and requests adx writes that sentence for you.

**Why does `api` not use plain `fetch`?**
Because `api` does four things `fetch` does not. It checks every answer against a schema. It maps a status to a kind. It sends only through `act.send` in `apply`, so a dry run cannot send. And it lets the test kit fake the server. Retries, timeouts and the cancelling of several requests run inside it, on RxJS. Your code never sees that: `api.get` answers a promise.

**Can I use my own HTTP client or a vendor SDK?**
Yes, but adx cannot see through it. Sends then belong in `apply` with `failed`, the answers need your own Zod schema, and the test kit cannot count them on a dry run. `remote` speaks JSON over HTTP. For that case it is the shorter way.

**Does my tool need an agent skill?**
No. The tool runs and passes its tests without one. Write a skill when the agent needs to know more than steps: when to use the tool, the flow of a task, when to stop and ask the person. Name it with `skill`, and the start answer shows its path.

**Does adx need a certain folder layout?**
No. adx reads no folder name, no file name and no order of imports. A command is a value, and the table of the tool takes it from wherever it lies. A small tool is one file, as `hello`. A larger one can be cut by feature, as the [tracker](#wrapping-a-remote-api): `bin/` for the entry, `cli/` for the tool, one folder per feature, and `core/` for what features share. A rule about which folder may import which is your own. adx neither knows nor checks it.

**How is a tool shipped and run?**
In its own repository, Node runs the `.ts` file as it is. Add `#!/usr/bin/env node` as the first line of the file that calls `main()`, `chmod +x bin/tracker.ts`, and link it onto your path, or name it under `bin` in `package.json` and run `pnpm link --global`. To publish on npm, compile to JavaScript first (`tsc` with `rewriteRelativeImportExtensions` and an `outDir`): Node does not strip types from files inside `node_modules`, so a published `.ts` file does not run. Either way the machine needs Node 24.2 or later.

## 8. Known limits

- **A stored file cannot be deleted through adx.** There is no `files.remove` yet. A command that deletes must call Node's `fs` in `apply` itself and throw `failed` with its own sentence. Such a delete has no check in `plan`, and it is not part of "all or none" with other files.
- **Parallel writes are not covered.** Two calls that write the same file at the same moment are not coordinated. The later write wins, and `files.update` can lose a change made between its read and its write.
- **A handler can go around adx.** A handler that calls `node:fs` or `fetch` itself can write half a file or send on a dry run. adx guards only what goes through `files` and a remote.
- **Two commands that name each other need a type.** If one command names a second in `next` or in `.command()`, and the second names the first, the compiler stops with "implicitly has type 'any'". Writing `(): Step[] =>` on one of the two functions fixes it, but the message does not say so.
- **Two files that need each other while they load break on the import order.** `detailOf(tickets)` and `keyOf(tickets)` read the list when their file loads. If the file of the list imports that file in turn, the file that loads first decides whether the list exists in time. A command named inside a function, such as `next`, `look` or `run`, is read only when the function runs. The list needs no import of its one-item command: adx derives that step.
- **A `look` names a command of its own folder.** `after` moves a `next` across folders to the tool, and `hint` moves the command of an issue there. The `look` of an effect stands in the handler. Under a rule that features do not import each other, it cannot name a command of another feature.
- **The compiler does not know what adx checked.** adx has already refused an unknown `lang`, but `byCode(lang)` still returns a language or `undefined`, so the code needs a branch for the compiler alone.
- **Two input types to keep apart.** `example: { dir: '.' }` is a string, while `run` gets a `Dir`. A field with a default is optional in `example` and present in `run`.
- **A named source without `Source` reports a typo in `needs` far from it.** A source written in `values`, and a named source typed with `Source<...>`, report the typo at the source. A named source with a parameter type of its own reports it at the `values` line that uses the source, in about ten lines and without a suggestion.
- **Some facts only show at startup or in a test.** An `id()` field without a source, an example that fails a `.regex()`, a root left out of `roots`, a kind left out of `stored`, a field named like a root, a hint for a command no tool lists, an `apply` without `look`, a command left out of `commands`, and a fake route that does not match the path in `api.get`.
- **A stored file written around its kind has no number.** A file written with `JSON.stringify` in place of `Friend.stringify` lacks `"version"`, and the next read takes it for format 1.
- **A status of a send is mapped by hand.** `on` exists for `get` only. For a send, take the error with `$try` and read `status(error)`, as [Errors you did not map](#6-what-every-tool-gets) shows.
- **A switch cannot be set to false by an option.** A boolean field with the default `true` is switched off through `--json` only.
- **`schema` shows no answer shape for an `effect`, or for a `read` without `output`.** Their answer type is inferred from your code.
- **The skill is not checked against the tool.** The kit checks that the file is a skill. It does not notice a command or a code the skill names and the tool no longer has.
- **Node does not check types.** `node hello.ts` runs code with type errors. The safety exists only where `tsc --noEmit` runs: in the editor, a pre-commit hook and CI.
- **Start time.** Node, a `.ts` file and Zod take about 65 ms before adx loads. An agent that calls a tool 40 times in a task waits about 2.5 s for that alone.
- **Shipping needs Node 24.2.** There is no single file to copy onto a machine, and a package for npm must be compiled first.
- **File modes are not applied on Windows.**
