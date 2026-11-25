# TODO

Open work on adx, the toolkit for command-line tools that AI agents drive.
<!-- last item number: 9 -->

## Next

- #1

## Toolkit

- [ ] #1 Build the toolkit that docs/guide.md describes, milestone by milestone, starting with the package setup; design/decisions.md is the source of truth, and the test kit proves the 15 rules adx builds in (added 2026-11-21, from honeyglass/skills #8)
      'proto/', 'docs/guide.md', 'design/decisions.md'
- [ ] #2 Delete a stored file through adx with `files.remove`, with its check in plan, a dry run and all or none with the other files; until then the guide names the gap under Known limits (added 2026-11-21)
      after:#1
- [ ] #3 Coordinate two calls that write the same file at the same moment, as design/concurrency.md recommends; tracked as honeyglass/skills #12 (added 2026-11-21)
      after:#1
      Plan: 'design/concurrency.md'
      'design/adx-write/'
- [ ] #7 Once @honeyglass/utils and adx are published to the npm registry, let adx bring utils itself as a registry peerDependency that pnpm installs, so a tool no longer names utils in its own package.json; one shared copy stays required, since `instanceof RefusalError` needs it; revisit decision 75 (added 2026-11-24)
      after:#1
- [ ] #8 Security review of adx once the build and the oriko migration are done: every check is an allow-list or a property (~/.claude/rules/security.md), close open flanks; decide whether network fetches (adx remotes, and oriko's `read --posting`) run in a sandbox, and whether lean-code's SandboxManager ('sandbox-manager/') and SyntaxManager ('syntax-manager/') can serve as dependencies there; both are not finished yet (added 2026-11-24)
      after:#1
      Plan: '~/src/github.com/honeyglass/lean-code/plannings/plans/security-managers/plan.md'
      '~/.claude/rules/security.md'
- [ ] #9 Decide where the fingerprint file adx.stored.json lies (decision 37); it covers the fingerprint of a tool's stored formats and the case that adx itself changes its own format; until then the conformance probe "stored data" stays a todo and packageFolder() in src/test/package.ts answers undefined (added 2026-11-24)
      'src/test/package.ts', 'src/test/conformance.ts'

## Proof of concept

- [ ] #5 Prove the remote side of adx (`remote`, `act.send`, `look`, retries) with a second tool that talks to a JSON server; oriko proves only the file side, as it has no server (added 2026-11-22)
      after:#1
- [ ] #6 Decide how adx reads a file the person names and an https address the person names, which `oriko read --posting` needs and adx cannot do today; oriko migrates `read` last and keeps its own code for it until then (added 2026-11-22)
      after:#1

## Docs

- [ ] #4 Write the package's README for npm, a skill for building tools with adx, and an `llms.txt` (https://llmstxt.org/) that explain the flow for agents, such as the `ALREADY_EXISTS` refusal with `--replace --dry-run`; it comes after #1 and before the publication (added 2026-11-21)
      after:#1
