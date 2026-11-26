# Code mode: how an agent could use a tool built with adx

Sketches for the feasibility study of TODO #18. Nothing here exists: the names `oriko.cvs`,
`oriko.show` and the shape of the generated API are assumptions the study has to settle.
The answers follow what adx gives every tool today: `{ ok, applied, result, next }` for a
success, and a refusal with `issues`, each with a `code`, a `path` and a `command`.

## 1. Where the functions come from

A tool already prints every input as JSON Schema (`oriko schema <command>`). The study checks
whether adx can derive a typed API from the same command table.

```ts
// generated from the command table of the tool, one function per command
declare const oriko: {
  cvs(input?: { fields?: string[]; page?: number }): Promise<Answer<{ items: Cv[]; total: number }>>;
  show(input: { cv: string; profile?: string }): Promise<Answer<Shown>>;
  build(input: { profile: string; out: string; dryRun?: boolean }): Promise<Answer<Built>>;
};
```

## 2. Several reads in one run, one small result

Today each call is one tool call, and every answer passes through the model. In code mode the
agent bundles them and returns only what it needs.

```ts
const { result } = await oriko.cvs();
const shown = await Promise.all(result.items.map(cv => oriko.show({ cv: cv.name })));
return shown.filter(answer => answer.ok && answer.result.pages > 2).map(a => a.result.name);
```

## 3. A refusal as a value

A first sketch: a refusal reaches the code as the same answer the command line prints, so the
agent can branch on its code and still sees the command adx names for it. Section 8 argues for
the other form, a thrown error that stops the run; the study picks one.

```ts
const answer = await oriko.show({ cv: 'jnae' });
if (answer.ok === false) {
  const [issue] = answer.issues;
  return { code: issue.code, path: issue.path, tryNext: issue.command }; // NOT_IN_LIST, cv, "oriko cvs"
}
```

## 4. A write keeps its guards inside bundled code

The dry run and `--replace` must hold exactly as on the command line. Bundled code must not be
a way to write without them.

```ts
const plan = await oriko.build({ profile: 'acme', out: 'acme.docx', dryRun: true });
if (plan.ok === false) return plan.issues;
if (plan.applied.some(file => file.replaces)) return { stopped: 'would replace', files: plan.applied };
return oriko.build({ profile: 'acme', out: 'acme.docx' });
```

## 5. Following the steps adx names

`next` lists the commands that make sense after an answer. The study checks whether a step can
be a function reference in code mode, so the agent follows it without building a command line.

```ts
const read = await oriko.read({ posting: 'posting.txt' });
for (const step of read.next) console.log(step.command); // "oriko schema profile", "oriko profile set"
```

## 6. One program, three ways in

The person's direction (2026-11-26): no new command and no second program. The tool stays a
command-line tool, and the same program speaks MCP when an MCP client starts it. A code mode
host then builds its API from the MCP tools.

```json
{ "mcpServers": { "oriko": { "command": "oriko" } } }
```

A call without arguments prints the start answer today, and an MCP client starts the program
without arguments too. Ways to tell the two apart, for the study to judge:

```text
A  a variable the MCP entry sets, such as ADX_MCP=1    explicit, the same on every run
B  the first line on stdin is a JSON-RPC "initialize"  no setup, but a start whose stdin
                                                       stays open and silent has to wait
```

B needs a deadline for the silent case, and adx answers the same way on every run, so a
guess by timing is the thing to avoid.

## 7. The same call three ways

One call, `show` for the CV `jane`, as each way in would carry it. The MCP shapes follow the
protocol's `tools/list` and `tools/call`; how adx fills them is an assumption.

On the command line, as today:

```console
$ oriko show --cv jane --json '{}'
{ "ok": true, "result": { "name": "jane", "pages": 2 }, "next": [{ "command": "oriko plan --cv jane" }] }
```

Over MCP, the client first lists the tools. Each command is one tool, its input the schema that
`oriko schema show` prints, and a command of a group gets one name, such as `profile_set`:

```json
{
  "name": "show",
  "description": "shows one CV, or one block of it",
  "inputSchema": { "type": "object", "properties": { "cv": { "type": "string" } }, "required": ["cv"] }
}
```

Then it calls one. The answer of the command is the structured content, unchanged:

```json
{ "method": "tools/call", "params": { "name": "show", "arguments": { "cv": "jane" } } }
```

```json
{
  "structuredContent": { "ok": true, "result": { "name": "jane", "pages": 2 }, "next": [{ "tool": "plan", "arguments": { "cv": "jane" } }] },
  "isError": false
}
```

A refusal comes back the same way, with `isError: true`, so a client that only reads the flag
still stops, and one that reads the content finds the issue and the call that helps:

```json
{
  "structuredContent": {
    "ok": false,
    "issues": [{ "code": "NOT_IN_LIST", "path": "cv", "next": { "tool": "cvs", "arguments": {} } }]
  },
  "isError": true
}
```

In code mode the host turns the listed tools into functions, and the agent writes code against
them. The tool does nothing more than answer `tools/call`:

```ts
// written by the agent, run by the host in its sandbox; each call is one tools/call
const { items } = (await oriko.cvs({})).result;
const long = [];
for (const cv of items) {
  const shown = await oriko.show({ cv: cv.name });
  if (shown.ok && shown.result.pages > 2) long.push(cv.name);
}
return long; // only this list reaches the model
```

What the three share is the point: one command table, one input schema per command and one
answer shape, so a guard such as `--replace` is a field of the input in all three.

## 8. What the person set, and how each rule could carry over

The direction (the person, 2026-11-26):

- The toolkit as it is stays the base. MCP and code mode sit on top of it as two more ways out
  of the same tool. Nothing is built a second time, and an author changes nothing in a tool.
- A tool stays a command-line tool. It gets no new command and no second program.
- The behavior stays as close to the command line as each way allows, so the rules adx builds
  in hold on every way. Where a way cannot carry a rule's form, adx keeps the rule's content
  and writes it in the form that works there. The study shows this rule by rule.
- The help adx gives, `next`, the hint and the command of an issue, must reach an agent over
  MCP and in code mode too, in a form it can follow without a guess.

What the toolkit has today, and what it would become:

| In the toolkit today             | Over MCP                          | In code mode                    |
| -------------------------------- | --------------------------------- | ------------------------------- |
| the command table                | the list of tools                 | functions the host makes of it  |
| the input schema of a command    | `inputSchema`                     | the types of the functions      |
| the answer `{ ok, result, next }`| `structuredContent`               | the value a function returns    |
| a refusal with `issues`          | `isError: true`                   | a thrown error with the hint    |
| a step as a value (`show.step()`)| a tool with its arguments         | a call of a function            |
| the kind of a command            | `readOnlyHint`, `destructiveHint` | as over MCP                     |

Only a thin layer would be new: telling an MCP start from a call, and rewriting the input and
the answer. Handlers, checks, `files`, the dry run and `--replace` run unchanged, since every
call takes the same path through the toolkit.

Three places where the form has to change so the content stays, each with the approach the
study is to prove:

1. **A step is a command line today, and MCP has no shell.** A step is already a value with
   fields and is written as a line only at the end. Over MCP adx writes the same step as a
   tool call, so the author writes it once.

   ```json
   { "command": "oriko show --cv jane" }
   ```

   ```json
   { "tool": "show", "arguments": { "cv": "jane" } }
   ```

2. **In code mode the model reads no answer between two calls.** The code is written before it
   runs, so a hint from the third call reaches the model only if the run stops there. A refusal
   goes out with `isError: true`. If a code mode host turns that into a thrown error, the run
   stops at the refusal and the error text, which carries the issue and the next call, goes
   back to the model by itself. Whether the hosts do so is for the study to read in their docs.

   ```ts
   const shown = await oriko.show({ cv: 'jnae' }); // throws: NOT_IN_LIST at cv. Next: call cvs({})
   ```

3. **A guard holds for one call, and code runs loops.** `--replace` and the dry run ask about
   one file. A loop over fifty profiles with `replace: true` is allowed fifty times and still
   replaces fifty files nobody looked at. Two means:
   - MCP's own marks per tool, set from the kind of the command, so a host can ask the person
     before a tool that writes runs.
   - A proof from the dry run that the replace has to name, so "look first, then replace" is
     required and not a habit. This one would be a new rule of adx on the command line too, so
     it is a decision for the person, not a part of the layer.

   ```ts
   const plan = await oriko.profile_set({ profile, json, dryRun: true });
   await oriko.profile_set({ profile, json, replace: plan.result.confirm });
   ```

A help has four parts. The code, the path and the hint are text and stay word for word on
every way. Only the next step changes its form, since it is an action:

```text
code       NOT_IN_LIST         the same on every way
path       cv                  the same on every way
hint       pick a stored CV    the same on every way
next step  oriko cvs           command line: a line to run
           cvs, {}             MCP: a tool with its arguments
           oriko.cvs({})       code mode: a call of a function
```

Still open, and for the study: the `next` of a call that succeeded. On the command line the
model reads it at once. In code mode it lies in a variable, and the model sees it only when
the code returns it, where a refusal comes back by itself.

```ts
const set = await oriko.profile_set({ profile: 'acme', json });
return 'done'; // set.next names preview and build, and nobody reads it
```

One way out to judge: the description of each tool names the steps that usually follow, so
the agent knows them when it writes the code. The details wait until the study starts (the
person, 2026-11-26).

Without a counterpart on the other ways: the exit code (it becomes `isError`), the text form
at a terminal, and the start answer (the list of tools takes its place).

Not wanted now: a tag in place of the full sha in the install line, and a second program such
as a bridge that starts the tool per call; the person chose the tool itself as the MCP server.

## Questions the sketches raise

- Which of the rules adx builds in a second way out touches, rule by rule, and for each whether
  its content holds over MCP and in code mode.

- Whether `next` and the command of an issue name a tool with arguments over MCP, as section 7
  sketches, where the command line names a command.
- How an option of adx, such as the dry run, `--replace`, `--fields` and `--page`, becomes a
  field of a tool's input without a clash with the command's own fields.

- Form: the program itself as an MCP server (section 6), and whether a generated TypeScript
  API is still needed beside it.
- Whether each function runs the real program or the tool in the same process, as `run` of the
  test kit does.
- How the data folder and `--home` reach the calls of one run.
- Whether a host's sandbox may reach the files and the servers a tool declares.
- What the current docs of Claude Code and of Cloudflare say; both are experimental.
