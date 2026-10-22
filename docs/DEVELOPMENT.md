# Development

## Supported working setup

The current working-tree migration is configured for **Node.js `26.7.0`** and **pnpm `12.12.1`**. Rust stable and Cargo are required for desktop development. Install the platform prerequisites described by the official [Tauri prerequisite guide](https://tauri.app/start/prerequisites/).

From the repository root in PowerShell:

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile
```

Expected versions for the current migration are `v26.7.0` and `12.12.1`. Use the version declared in the repository's package-manager/toolchain configuration if that is deliberately changed later.

## Run the application

Browser mode (in-memory demo vault, useful for UI work and browser E2E):

```powershell
pnpm dev
```

Open `http://localhost:1420`. Keep the dev-server terminal running while tests use the page.

Desktop mode (Tauri native window and real filesystem boundary):

```powershell
pnpm tauri dev
```

The first Rust build can take longer than subsequent launches. Vite is configured for port `1420`; if it is occupied, stop the other server instead of silently changing the expected port.

## Required checks

Run before committing a focused change:

```powershell
pnpm typecheck
pnpm build
git diff --check
```

`pnpm build` currently runs TypeScript checking and the Vite production build. The repository has an extensive collection of calibration scripts, but CI intentionally runs a small, selected slice rather than every historical round.

For the currently reported key browser regressions, start `pnpm dev` in one terminal and run these in another:

```powershell
node .calibration/r23-e2e.mjs
node .calibration/r24-e2e.mjs
node .calibration/r276-e2e.mjs
```

Playwright is a workspace dependency in `.calibration/`. If a fresh environment has no Chromium browser installed, use:

```powershell
pnpm --filter geode-calibration exec playwright install chromium
```

The last supplied local run reported R23 **22/22**, R24 **12/12**, and R276 **14/14**. This documentation build has not rerun those tests. Re-run them after changes to the editor, workspace, graph, vault, or shared compatibility code.

For native code or Tauri configuration changes, also verify the Rust build, for example:

```powershell
cargo check --manifest-path src-tauri/Cargo.toml
```

## Where to start reading

- Overall module responsibilities and invariants: [Architecture](ARCHITECTURE.md).
- Obsidian plugin shims and support boundaries: [Obsidian compatibility](OBSIDIAN-COMPAT.md).
- Native Geode plugin API: [Plugins](PLUGINS.md).
- Performance measurements: [Performance](PERFORMANCE.md).
- Signing, version tags, and draft releases: [Distribution](DISTRIBUTION.md).

## Working safely

- Keep a change focused. Inspect callers and existing tests before changing a shared contract.
- For vault/editor changes, consider autosave, closing a window, renaming or deleting the active file, external edits, and unsaved transactions.
- Update tests with behavior changes. A historical probe that no longer exists must not be cited as a passing current test.
- Do not run broad cleanup commands such as `git reset --hard`, `git clean -fd`, or blanket `git add -A` in a working tree containing unrelated migration work.
- Keep local diagnostics, build outputs, private vault files, and updater credentials out of commits.

## When finishing a session

Record the changed behavior, the checks that actually ran, any checks skipped and why, and the next open decision. Keep this information in the commit/PR description or the relevant short roadmap note, not in a permanent handoff diary.
