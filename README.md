<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/header-dark.svg">
  <img src="brand/header.svg" alt="adx" width="520">
</picture>

**Command-line tools that AI agents and people can both use well, with the Agent DX rules built in.**

[Quickstart](#-quickstart) · [Guide](docs/guide.md) · [Docs](#-docs) · [Roadmap](#-roadmap) · [Report an issue](https://github.com/honeyglass/adx/issues)

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
what the agent can do next, and every mistake comes back with its fix. adx is designed, not built
yet: this repository holds its guide and a type-only prototype in which every code example of the
guide compiles.

### Why adx?

- 🤖 **Built for AI agents**: JSON when piped, text at a terminal, one answer shape for every tool.
- 🧭 **Every mistake at once**: all mistakes of a call come back in one answer, each with its fix and a command to run.
- 🛑 **Nothing passes silently**: an unknown command, option, word or field is refused, never guessed.
- 🧪 **Dry runs for free**: every command that changes something takes `--dry-run` and changes nothing.
- 📄 **Files written whole**: a command writes all of its files or none, and replaces one only with `--replace`.
- ✍️ **Typos that do not compile**: every field you name in a command is checked by the TypeScript compiler.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/terminal-dark.svg"><img src="brand/icons/terminal.svg" width="24" height="24" alt=""></picture> Quickstart

```bash
# install adx and Zod into a new project (planned: the package is not published yet)
pnpm add @honeyglass/adx zod

# run a tool written with adx, here the guide's hello.ts
node hello.ts greet --name Ada

# piped, the same call answers one JSON document
node hello.ts greet --name Ada | jq

# a call with two mistakes is refused with both, each with its fix
node hello.ts greet --nmae Ada again
```

The commands show how adx will work once it is built. The [Quickstart of the guide](docs/guide.md#2-quickstart)
shows the whole `hello.ts`, about ten lines, and what each call answers.

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
