# Contributing

Ideas and pull requests are welcome. Before you change how adx behaves,
[open an issue](https://github.com/honeyglass/adx/issues/new) so we can talk it through first.
Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- **Node 24.2** or later.
- **pnpm**, in the version `packageManager` in [package.json](package.json) pins.

```sh
pnpm install --frozen-lockfile
```

## How the repository is laid out

adx is designed, not built yet. The repository holds:

- [docs/](docs/): the user guide in English and German, the German cheat sheet, and a page that sets
  the old API against the current one.
- [design/](design/): the owner's decisions, which every other file follows, the reviews of the
  guide, the research on how known CLIs keep their data, and the design of parallel writes with its
  experiments.
- [proto/](proto/): a type-only prototype. [proto/adx/index.d.ts](proto/adx/index.d.ts) declares the
  API; every `ts` block of the guide stands in one of its files and compiles there.

A change to the API changes [design/decisions.md](design/decisions.md) first, then the prototype,
then both guides and the cheat sheet, so they never disagree.

## Before you open a pull request

Make sure these pass:

```sh
pnpm run typecheck
pnpm run format:check
```

Write each commit message as a [Conventional Commit](https://www.conventionalcommits.org), such as
`docs(guide): show a refusal at the terminal`. The description of a pull request is its commit
message, so it says what changes and why.

## License

By contributing, you agree that your contribution is licensed under the [AGPL-3.0](LICENSE), the
license of adx. The files in [brand/](brand/) are the project's identity and stay outside that
license.
