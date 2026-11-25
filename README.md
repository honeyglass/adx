<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/header-dark.svg">
  <img src="brand/header.svg" alt="adx" width="520">
</picture>

**A toolkit for building command-line tools that follow the 16 Agent DX rules, so AI agents and people can both use them well.**

[Quickstart](#-quickstart) · [Agent DX rules](#-the-16-agent-dx-rules) · [Guide](docs/guide.md) · [Docs](#-docs) · [Roadmap](#-roadmap) · [Report an issue](https://github.com/honeyglass/adx/issues)

![Version](https://img.shields.io/github/package-json/v/honeyglass/adx?label=version&color=8b5cf6)
![License](https://img.shields.io/github/license/honeyglass/adx?color=8b5cf6)
![Node](https://img.shields.io/badge/node-24+-8b5cf6.svg)
[![CI](https://github.com/honeyglass/adx/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/honeyglass/adx/actions/workflows/ci.yml)

</div>

---

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/file-text-dark.svg"><img src="brand/icons/file-text.svg" width="24" height="24" alt=""></picture> What is adx?

adx is a TypeScript toolkit for command-line tools. You describe each command with a Zod schema for
its input and a function that does the work. adx reads the arguments, checks them, writes the
answer and sets the exit code. An AI agent that runs such a tool cannot ask a colleague what an
option means; it reads what the tool answers. So every answer of an adx tool says what happened and
what the agent can do next, and every mistake comes back with its fix. adx is in development: it is
installed from GitHub, pinned by the sha of a commit, until it is published to npm.

### Why adx?

- 📏 **[The Agent DX rules built in](#-the-16-agent-dx-rules)**: a tool built on adx follows 15 of the 16 rules without code of yours; the agent skill is yours to write.
- 🤖 **Built for AI agents**: JSON when piped, text at a terminal, one answer shape for every tool.
- 🧭 **Every mistake at once**: all mistakes of a call come back in one answer, each with its fix and a command to run.
- 🛑 **Nothing passes silently**: an unknown command, option, word or field is refused, never guessed.
- 🧪 **Dry runs for free**: every command that changes something takes `--dry-run` and changes nothing.
- 📄 **Files written whole**: a command writes all of its files or none, and replaces a file the person keeps only with `--replace`.
- ✍️ **Typos that do not compile**: every field you name in a command is checked by the TypeScript compiler.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/terminal-dark.svg"><img src="brand/icons/terminal.svg" width="24" height="24" alt=""></picture> Quickstart

```bash
# adx is in development and not on npm yet, so it and the utils it needs beside it come from
# GitHub, each pinned by the full sha of a commit; Zod comes from npm
pnpm add github:honeyglass/adx#4c363be52b9fe61ceadb7276e071b5b8e6c18e64 github:honeyglass/utils#a6c8b941393ba0831b2909a54dae0a59d40f50bf zod

# run a tool written with adx, here the guide's hello.ts
node hello.ts greet --name Ada

# piped, the same call answers one JSON document
node hello.ts greet --name Ada | jq

# a call with two mistakes is refused with both, each with its fix
node hello.ts greet --nmae Ada again
```

The [Quickstart of the guide](docs/guide.md#2-quickstart) shows the whole `hello.ts`, about ten lines, and what each call answers.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/list-checks-dark.svg"><img src="brand/icons/list-checks.svg" width="24" height="24" alt=""></picture> The 16 Agent DX rules

Each rule says what a tool does so that an agent can use it without help. The seven rules marked 📄
come from Justin Poehnelt's article
[Rewrite your CLI for AI agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/);
the nine marked ➕ come from building tools for agents, such as
[oriko](https://github.com/honeyglass/oriko). adx builds in every rule but the agent skill.

1. 📄 **Raw JSON input**: takes the whole input of a command as one JSON object.
2. 📄 **Schema at runtime**: prints every command and the exact input each one accepts.
3. 📄 **JSON when piped**: answers text at a terminal and JSON when a program reads it.
4. 📄 **Input hardening**: keeps every path inside an allowed folder and every id within allowed characters.
5. 📄 **Dry runs**: a command that writes or sends says what it would do, and does nothing.
6. 📄 **Agent skill**: ships a manual for agents with the code; you write it, and adx checks that a skill file you name is one.
7. ➕ **Checks in layers**: checks shape, then meaning, then the costly checks, and answers all errors of a layer at once.
8. ➕ **Errors with a hint**: each error says where it is and what to change.
9. ➕ **All or nothing**: a refused or failed command writes nothing.
10. ➕ **Exit codes 0, 1, 2**: 0 for success, 1 for a refusal, 2 when the tool broke.
11. ➕ **Plan before the file**: shows the plan of the result before it writes the result.
12. ➕ **Hints that run**: a refusal names the command that lists the fitting values.
13. ➕ **Options that list**: an option given without its value lists the values it accepts.
14. ➕ **Next steps**: the tool alone says where to start, and a success names the commands that can follow.
15. ➕ **Nothing passes silently**: refuses an unknown command, option, word or input field.
16. 📄 **Context discipline**: a large answer comes as an outline, and the caller names the fields or the one item it wants in full.

The rules and how to check a tool against them:
[honeyglass/skills, `adx/cli`](https://github.com/honeyglass/skills/blob/main/adx/cli/references/rules.md).

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/plug-dark.svg"><img src="brand/icons/plug.svg" width="24" height="24" alt=""></picture> Compatibility

- **Node 24.2 or later**, which runs `.ts` files directly.
- **TypeScript** checks the types, with one line of `tsconfig.json` that extends adx's base.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/puzzle-dark.svg"><img src="brand/icons/puzzle.svg" width="24" height="24" alt=""></picture> Principles

- **[The agent judges, the tool checks](docs/guide.md#1-what-adx-is)**: every call passes checks that refuse what does not fit and say how to fix it.
- **[Nothing passes silently](docs/guide.md#1-what-adx-is)**: adx refuses what it does not know and never guesses.
- **[One answer shape](docs/guide.md#6-what-every-tool-gets)**: every tool answers the same JSON, with four kinds of refusal and the exit codes 0, 1 and 2.
- **[The person decides](docs/guide.md#1-what-adx-is)**: a token comes from the person's environment, and a refusal of kind `ask` stops the agent until the person answers.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/book-open-dark.svg"><img src="brand/icons/book-open.svg" width="24" height="24" alt=""></picture> Docs

- **[Guide](docs/guide.md)**
- **[Cheat sheet](docs/cheatsheet.md)**
- **[Leitfaden (Deutsch)](docs/guide.de.md)**
- **[Spickzettel (Deutsch)](docs/cheatsheet.de.md)**

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/map-dark.svg"><img src="brand/icons/map.svg" width="24" height="24" alt=""></picture> Roadmap

- [ ] Build the toolkit the guide describes, with its test kit.
- [ ] Delete a stored file through adx, with a dry run and a plan.
- [ ] Coordinate two calls that write the same file at the same moment.
- [ ] A skill for building tools with adx, and an `llms.txt` for agents.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/wrench-dark.svg"><img src="brand/icons/wrench.svg" width="24" height="24" alt=""></picture> Development

Ideas and pull requests are welcome; [CONTRIBUTING.md](CONTRIBUTING.md) says how to start and which
checks must pass. Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md), and
[SECURITY.md](SECURITY.md) says how to report a vulnerability.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/scale-dark.svg"><img src="brand/icons/scale.svg" width="24" height="24" alt=""></picture> License

adx is licensed under the [AGPL-3.0](LICENSE). The header and the icon tiles in [brand/](brand/) are
not covered by this license; all rights to them stay with Serkan Sipahi. The icon drawings come from
Lucide, under the license in [brand/icons/LICENSE](brand/icons/LICENSE).
