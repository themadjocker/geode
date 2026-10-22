# Roadmap

## Product direction

Build a reliable, local-first Markdown knowledge base for Windows, with a strong editor and navigation experience, extensible Geode plugins, and an incrementally useful Obsidian compatibility layer. Preserve users' plain Markdown files and keep release/update behavior trustworthy.

## Non-negotiable priorities

1. **User data safety:** no silent loss or unintended modification of vault contents.
2. **Build health:** TypeScript checks, production build, and relevant Rust checks pass.
3. **Reproducible verification:** behavior changes have a current test or documented manual check.
4. **Honest compatibility:** support claims match tested behavior.
5. **Maintainable scope:** prefer cohesive improvements over recreating a feature solely to increase a parity count.

## Latest supplied milestone

**R276 / version `0.269.0`** is the latest milestone supported by the local evidence supplied for this documentation rewrite. It added a configurable radial force to the global graph layout while retaining local graph behavior. The reported R276 regression was 14/14 assertions. R23 and R24 regressions were reported as 22/22 and 12/12 respectively. These are reports from the supplied terminal history; re-run them to establish a fresh baseline.

## Work queue

The old roadmap has a large round-by-round log. That history should not be the live backlog. Begin the next development session by checking the actual working tree, running required checks, and revalidating the following items:

- **Compatibility gap audit:** refresh command/API support claims, especially items carried forward from older snapshots.
- **Plugin-test strategy:** the previously documented R258/R259 scripts were absent from the supplied `.calibration/` listing. Do not claim those tests run. Decide whether a reproducible real-plugin integration test is still needed before reintroducing fixtures.
- **Updater readiness:** confirm the Tauri endpoint points to the intended canonical release repository and the CI signing secrets/public key are correctly configured.
- **Documentation and screenshots:** update the root README and contributor guide to the pnpm migration, current workflow, new document paths, and current UI screenshots.
- **Performance baseline:** rerun measurements on the current build before claiming improvement or regression against the older benchmark numbers.

## How to add a roadmap item

Use this compact shape:

```text
Title
- User impact:
- Current evidence:
- Acceptance test:
- Priority / dependency:
```

When completed, move only the durable outcome and important lesson into a short milestone summary. Do not append the full development log to this file.
