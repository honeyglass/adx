# TODO

Open work on adx, the toolkit for command-line tools that AI agents drive.
<!-- last item number: 4 -->

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

## Docs

- [ ] #4 Write the package's README for npm, a skill for building tools with adx, and an `llms.txt` (https://llmstxt.org/) that explain the flow for agents, such as the `ALREADY_EXISTS` refusal with `--replace --dry-run` (added 2026-11-21)
      after:#1
