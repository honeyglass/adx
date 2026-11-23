# ship

`ship` releases apps to their environments. It lists apps, builds releases from commits, promotes
a release to an environment and rolls it back, and changes the variables and host names of an
environment. All of it goes through one server, and notes drafts are kept in a data folder. The
example shows the tool API of adx on a CLI of realistic size: 39 TypeScript files and 16
commands, cut by feature as in oriko. It has types only: `pnpm run typecheck` checks it against
`../adx/index.d.ts` and `../adx/test.d.ts`, and nothing runs.

In adx a command is a value made by `read({...})`, `list({...})` or `effect({...})`. The
tool is one `tool({...})` literal whose `commands` table nests the command words. Each feature
folder brings its own table, and `cli/ship.ts` hangs them in. A step from a command of one feature
to a command of another stands in `cli/next.ts`, made with `after(command, steps)`. A command
that helps with a refusal and lies in another feature stands in `cli/hints.ts`, made with
`hint(code, step)`.

## Folders

```text
ship/
├── bin/
│   └── ship.ts               the program: runs the tool on the arguments of the call
├── cli/
│   ├── ship.ts               the tool: name, data folder, server, global input, command table, start
│   ├── next.ts               the steps that lead from one feature into another
│   └── hints.ts              the commands that help with a refusal and lie in another feature
├── core/                     what several features share; imports only core/
│   ├── app.ts                the global input --app, and read, list, effect typed with it
│   ├── server.ts             the server every feature talks to (SHIP_URL, SHIP_TOKEN)
│   ├── home.ts               the data folder ~/.ship (--home, SHIP_HOME)
│   ├── sources.ts            appChoices and envChoices: values that come from the server
│   ├── env.schema.ts         Env, one environment, read by env/ and releases/
│   ├── issues.ts             frozen (ENV_FROZEN), raised by env/ and releases/
│   └── files.limits.ts       FILE_LIMITS.noteBytes, the largest notes draft ship reads
├── account/
│   └── whoami.ts             whoami
├── apps/
│   ├── list.ts               app list
│   └── status.ts             status
├── env/
│   ├── commands.ts           the table of env/: list, var, domain
│   ├── list.ts               env list
│   ├── issues.ts             VAR_NOT_FOUND, BAD_HOST, HOST_TAKEN
│   ├── vars/
│   │   ├── commands.ts       the table of vars/: list, show, set
│   │   ├── list.ts           env var list
│   │   ├── show.ts           env var show
│   │   ├── set.ts            env var set
│   │   └── var.schema.ts     Var, read by all three commands of vars/
│   └── domains/
│       ├── commands.ts       the table of domains/: list, add
│       ├── list.ts           env domain list
│       ├── add.ts            env domain add
│       └── domain.schema.ts  Domain, read by both commands of domains/
├── releases/
│   ├── commands.ts           the table of releases/: list, show, create, promote, notes
│   ├── list.ts               release list
│   ├── show.ts               release show
│   ├── create.ts             release create
│   ├── promote.ts            release promote
│   ├── rollback.ts           rollback, listed at the top by cli/
│   ├── issues.ts             RELEASE_NOT_FOUND, RELEASE_RETIRED, NO_PREVIOUS_RELEASE
│   ├── release.schema.ts     Release, read by list, show, create and promote
│   └── notes/
│       ├── commands.ts       the table of notes/: draft, show
│       ├── draft.ts          release notes draft
│       ├── show.ts           release notes show
│       └── drafts.ts         where drafts lie in ~/.ship, which exist, and draftChoices
└── tests/
    ├── ship.test.ts          conformance of the tool and of the program, two command tests, one call
    └── seed/notes/shop-web/
        └── spring.md         a notes draft the tests find in the data folder
```

## Commands

This is the command tree as a user types it, with the file behind each command.

```text
ship                          the start answer: steps to app list and release list
ship app list                 apps/list.ts
ship status                   apps/status.ts
ship whoami                   account/whoami.ts
ship release list             releases/list.ts
ship release show             releases/show.ts
ship release create           releases/create.ts
ship release promote          releases/promote.ts
ship release notes draft      releases/notes/draft.ts
ship release notes show       releases/notes/show.ts
ship rollback                 releases/rollback.ts
ship env list                 env/list.ts
ship env var list             env/vars/list.ts
ship env var show             env/vars/show.ts
ship env var set              env/vars/set.ts
ship env domain list          env/domains/list.ts
ship env domain add           env/domains/add.ts
```

Every command takes `--app`, the global input, with three exceptions: `app list` and `whoami` set
`global: false` and take no app, and `status` sets `global: { app: 'optional' }` and counts all
apps when `--app` is missing.

A folder is named for what it holds, a command word for what the user types. They differ on
purpose in these places:

- `releases/` is called as `release`, and `apps/` as `app`.
- `env/vars/` is called as `env var`, and `env/domains/` as `env domain`. The comment in
  `env/commands.ts` says so. The table imports the vars table as `variable`, since `var` is a
  reserved word in JavaScript, and lists it under the key `var`.
- `releases/rollback.ts` is the top-level `rollback`. It lives in `releases/` because it works on
  releases, but `releases/commands.ts` leaves it out and `cli/ship.ts` lists it at the top.
- `apps/status.ts` is the top-level `status`, and `account/whoami.ts` the top-level `whoami`.
- `apps/` and `account/` have no `commands.ts`. `cli/ship.ts` builds `app: { list: apps }` itself
  and lists `status` and `whoami` directly.

A list command is exported under a plural noun (`apps`, `releases`, `envs`, `vars`, `domains`) and
called by the word `list`. A command does not know its own words: `Command.name` is set by the
tool that lists it.

## How the pieces fit

### Entry

`bin/ship.ts` is the whole program:

```ts
#!/usr/bin/env node
// The program `ship`: the tool, run on the arguments of the call.
import { ship } from "../cli/ship.ts";

await ship.main();
```

### The tool table

`cli/ship.ts` is the only file that sees every feature. It names the tool, hands adx the data
folder and the server, sets the global input, and hangs in the tables:

```ts
export const ship = tool({
  name: "ship",
  version: "2.3.0",
  does: "releases apps to their environments",
  roots: [home],
  remotes: [api],
  global: app,
  commands: {
    app: { list: apps },
    release,
    env,
    rollback,
    status,
    whoami,
  },
  next,
  hints,
  start: () => [apps.step(), releases.step()],
});
```

`release` and `env` are the tables of `releases/commands.ts` and `env/commands.ts`, imported as
`commands as release` and `commands as env`. A key is one word of the call, and a nested object is
a group of commands. `next` is the list from `cli/next.ts` and `hints` the list from
`cli/hints.ts`, see "Steps across features" and "Hints across features" below.

### core/

`core/` holds what more than one feature needs, one topic per file.

- Global input. `core/app.ts` defines `--app` once and hands out `read`, `list` and `effect` with
  it typed in, so every handler gets `app` as a string without declaring it:

  ```ts
  export const app = global({
    input: z.object({ app: id().describe("the app key, such as shop-web") }),
    example: { app: "shop-web" },
    values: { app: appChoices },
  });

  export const { read, list, effect } = app;
  ```

  Every command file imports `read`, `list` or `effect` from here, never from
  `@honeyglass/adx`.

- Server. `core/server.ts` is `remote('ship', ...)` with the address from `SHIP_URL` (default
  `https://ship.example.com/api`) and a bearer token from `SHIP_TOKEN`. Commands read with
  `api.get(path, schema)`, which checks the answer against the schema, and build sends with
  `api.post` and `api.put`.
- Data folder. `core/home.ts` is `root('home', envDir('SHIP_HOME'))`: `~/.ship`, moved by
  `SHIP_HOME` or `--home`. Only `releases/notes/` uses it.
- Shared schemas. `core/env.schema.ts` holds `Env`.
- Shared sources. `core/sources.ts` holds `appChoices` and `envChoices`, which ask the server for
  the possible values of `--app` and `env`. `appChoices` offers each app by its key, with its name
  as the description. `envChoices` answers `needs('app')` while the app is unknown.
- Shared issue codes. `core/issues.ts` holds `frozen`, `ENV_FROZEN` of kind `ask`, raised by
  `env var set` and `release promote`.
- Limits. `core/files.limits.ts` holds `FILE_LIMITS.noteBytes`, 256 KiB, read by
  `release create` and `release notes show`.

### A feature folder

A feature folder holds one file per command, a `commands.ts` with its table, an `issues.ts` with
the codes it raises, and a `*.schema.ts` for a shape several of its commands read. A sub-feature is
a folder inside it with its own `commands.ts`, which the parent table hangs in under one word:

```ts
export const commands = { list: envs, var: variable, domain };
```

A sub-feature may import its parent: `env/domains/add.ts` and `env/vars/set.ts` take their codes
from `env/issues.ts`, and `releases/notes/draft.ts` imports `releases/create.ts`. Files that are no
command can sit beside the commands, such as `releases/notes/drafts.ts`, which says where drafts
lie and which exist.

### Where schemas live

- Inline, when one command reads the shape: `App` in `apps/list.ts`, `Page` in `releases/list.ts`,
  the user in `account/whoami.ts`, the output of `release notes show`.
- In the feature as `*.schema.ts`, when several of its commands read it: `Release`, `Var`,
  `Domain`.
- In `core/`, when several features read it: `Env`, read by `env list`, `env var set`,
  `release promote` and `rollback`.

Issue codes follow the same rule: `whoami` keeps its one code `USER_INACTIVE` in its own file,
`env/` and `releases/` have an `issues.ts`, and `ENV_FROZEN` sits in `core/issues.ts`.

## One command: `env var set`

`env/vars/set.ts` changes one variable of an environment. This is the command without its imports:

```ts
export const set = effect({
  does: "changes one variable of an environment",
  input: z.object({
    env: z.string().describe("the environment"),
    key: id().describe("the variable to change"),
    value: z.string().describe("the new value"),
  }),
  example: {
    env: "staging",
    key: "PAYMENT_URL",
    value: "https://pay.example.com",
  },
  values: { env: envChoices, key: keyOf(vars) },
  replace: false,
  plan: async ({ app, env, key }, { refuse }) => {
    const target = await api.get(["apps", app, "envs", env], Env);
    if (target.frozen)
      return refuse(shared.frozen.at("env", `${env} is frozen`));
    const path = ["apps", app, "envs", env, "vars", key];
    const old = await api.get(path, Var, { on: { 404: undefined } });
    return old === undefined
      ? refuse(issue.noVar.at("key", `${env} has no variable ${key}`))
      : { env, key, secret: old.secret, changedBefore: old.updated };
  },
  apply: async ({ app, env, key, value }, { act }) => {
    const request = api.put(["apps", app, "envs", env, "vars", key], { value });
    return { variable: await act.send("the changed variable", request, Var) };
  },
  look: ({ env, key }) => show.step({ env, key }),
  next: (_, { env }) => [
    tell(`restart ${env} in the web console, so it reads the new value`),
  ],
});
```

What each part is for:

- `effect` comes from `core/app.ts`, so `app` stands in every handler's input next to `env`, `key`
  and `value`.
- `does` is the one line that describes the command.
- `input` is what this command adds to the global input. `id()` marks the key as an identifier.
- `example` is one valid input. The global part, `app: 'shop-web'`, comes from `core/app.ts`.
- `values` says where a field's values come from. `env` asks the server through `envChoices`.
  `keyOf(vars)` says the key is a key of the `env var list` answer.
- `replace: false` switches off `--replace`, which every effect takes otherwise. `set` sends a
  request and writes no file, so there is nothing to replace.
- `plan` runs every check and is the whole dry run. It refuses a frozen environment with the shared
  `ENV_FROZEN` and a missing variable with `VAR_NOT_FOUND`, each at the field it concerns. `refuse`
  is typed with the fields of this command and the global ones, so a misspelt field does not
  compile. Its answer, `{ env, key, secret, changedBefore }`, is the answer of the dry run.
- `apply` runs only on a real run. It sends the `PUT` through `act.send` and returns what the real
  run adds; adx answers `{ ...planned, ...applied }`.
- `look` names the call that shows whether the send took effect, here `env var show` for the same
  environment and key. adx refuses to start when an effect has `apply` but no `look`.
- `next` names the steps after a success. `tell(...)` is a step for the person, with no command.

## From list to detail to effect

The commands point at each other with steps. A step is made by `.step(...)` on a command value, so
the link is an import and the type checker sees it. A step may leave fields out; the required ones
it lacks are derived as still needed.

The values tie a field to a list:

- `keyOf(list)`: the field takes a key of that list.
- `detailOf(list)`: the same, and this command is the one that shows one item of the list in full.

For releases, the chain runs like this, with the handles from the examples:

```text
release list                      key: id, such as r214
release show --release r214       detailOf(releases)
release promote --release r214 --env staging
                                  keyOf(releases); look: release show; next: rollback --env staging
rollback --env staging            look: release list --state live
```

`release create --commit 4f2a91c` looks with `release list` and names two next steps for the new
release: `release show` and `release promote`, both with `release: release.id` from the answer.
`release notes draft --name winter-sale` names `release create --notes winter-sale` as next, and
`create` offers the existing drafts through `draftChoices`.

For variables, `env var list --env staging` has the key `key`, `env var show` takes
`detailOf(vars)`, and `env var set` takes `keyOf(vars)` and looks with
`env var show --env staging --key PAYMENT_URL`. For host names, `env domain add` looks with
`env domain list --env staging`; there is no detail command.

`start` in `cli/ship.ts` is the answer to `ship` called alone: `[apps.step(), releases.step()]`,
the two lists to begin with.

### Steps across features

A `next` whose steps stay in the command's own folder stands at the command: `release promote`
names `rollback`, and both lie in `releases/`. A step into another feature cannot stand there,
because a feature imports no other feature. Such steps stand in `cli/next.ts`, the list that
`cli/ship.ts` hands to the tool as `next`:

```ts
export const next = [
  // releases/ to env/: after a promotion, the environments show what is live where
  after(promote, () => [envs.step()]),
  // env/ to releases/: a changed variable takes effect with the next promotion
  after(set, (_, { env }) => [promote.step({ env })]),
];
```

`after` takes a command and a function like `next`: it gets the answer of the real run and the
input, typed by the command. Its steps follow the command's own. So `release promote` answers
`rollback --env staging` and then `env list`, and `env var set` answers its step for the person
and then `release promote --env staging`, which still needs the release.

### Hints across features

A refusal can name a command that helps. When that command lies in the handler's own feature, the
issue carries it with `.command(step)`. `ENV_FROZEN` is raised by `release promote` in
`releases/` and by `env var set` in `env/`, and its code lies in `core/issues.ts`. The command that
helps is `env list`, which shows which environments are frozen. `core/` imports no feature, and
`releases/` may not import `env/`. So the command stands in `cli/hints.ts`, the list that
`cli/ship.ts` hands to the tool as `hints`:

```ts
export const hints = [
  // core/ to env/: the list of environments shows which are frozen
  hint(frozen, () => envs.step()),
];
```

`hint` takes a code and a function that answers one step to a command. adx adds that command to
every issue of the code, so a frozen `release promote` answers `ship env list --app shop-web`. A
`.command(step)` at the issue would win over it, and the hint wins over the command adx derives
from the source of the field, here the list of values of `env`.

## Tests

`tests/ship.test.ts` imports:

- `conformance` and `fake` from `@honeyglass/adx/test`.
- `ship` from `cli/ship.ts`, the assembled tool.
- `api` from `core/server.ts`, to fake the server with a table of routes such as
  ``[`GET ${staging}`]: env``.
- `draft` and `promote` from `releases/`, to call two commands on their own.
- `run` from `@honeyglass/adx/test`, to run one whole call in the process of the test.

The tool comes from `cli/` because only there do the commands have their words, the global input,
the data folder and the server. `conformance(t, ship, samples)` checks the agent rules on the whole
tool in-process, and `conformance(t, ['node', 'bin/ship.ts'], samples)` checks them on the real
program. The samples set `SHIP_TOKEN`, the fake server, and `tests/seed` as the data folder, which
holds the draft `spring` of `shop-web`.

The two command tests call `.invoke(input, options)` with `app` in the input:

- `promote` on a frozen staging, as a dry run, answers kind `ask` with `ENV_FROZEN`, and the
  command of the issue is the hint from `cli/hints.ts`.
- `draft` with the taken name `spring` is refused with `ALREADY_EXISTS`, and with `replace: true`
  answers `replaces: true`.

The last test calls `run(ship, ['relase', 'list', '--app', 'shop-web'], samples)`: the whole call
with a mistyped command, from the arguments to the exit code 1.

## The import rule

The rule comes from oriko: a feature folder imports only from `core/` and from itself, `core/`
only from `core/`, and only `cli/` combines features. `bin/` and `tests/` sit outside it, as in
oriko. ship keeps it; the imports of `account/`, `apps/`, `env/` and `releases/` reach only
`core/` and their own folder. These are the places where it decides where a file goes:

- `envChoices` is in `core/sources.ts`, because `release promote` and `rollback` need the
  environments of an app and `releases/` may not import `env/`.
- `Env` is in `core/env.schema.ts` for the same reason.
- `ENV_FROZEN` is in `core/issues.ts`, because `env/` and `releases/` both raise it.
- `appChoices` is in `core/sources.ts`, because `core/app.ts` needs it and `core/` imports only
  `core/`.
- `start` and the `app` table are in `cli/ship.ts`, the one place that may combine `apps/` and
  `releases/`.
- The steps between `releases/` and `env/` are in `cli/next.ts`, for the same reason.
- The command for `ENV_FROZEN` is in `cli/hints.ts`, for the same reason.

ship has no test that checks the rule, as oriko's `tests/api/layout.api.spec.ts` does.

## Open points

- A `look` across features has no place. `after` moves a `next` to `cli/`, as oriko does in
  `cli/next.ts`, and `hint` moves the command of an issue there. The `look` of an effect stands in
  the handler, so it names a command of its own feature only.
- `replace: false` stands on every sending effect: `env var set`, `env domain add`,
  `release create`, `release promote` and `rollback`. Only `release notes draft`, which writes a
  file, keeps `--replace`. The line stays because ship has a root, `home`: adx offers `--replace`
  to every effect, and only the command knows that it writes no file.
- Feature tables are unchecked until `tool()`. `export const commands = { list: vars, show, set }`
  is a plain object, so a wrong entry shows as an error in `cli/ship.ts`, not in the feature.
- A deep command has many import lines: `env/vars/set.ts` has 11 for a command of 26 lines,
  `releases/promote.ts` has 12.
