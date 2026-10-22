# Obsidian compatibility gap audit

## Purpose

This file tracks gaps that are worth verifying against current Geode behavior. It is not a claim of complete Obsidian parity. Before implementing a row, reproduce it against the current build and confirm that the behavior is in scope.

## Evidence standard

Every new entry should include:

- **Surface/API:** a precise command, method, lifecycle, or UI behavior.
- **Expected behavior:** grounded in public API documentation or observable behavior.
- **Current behavior:** a short, reproducible statement with the affected code path.
- **Status:** `missing`, `partial`, `implemented`, `out-of-scope`, or `needs-recheck`.
- **Test:** a current test name or a concise manual reproduction path.
- **Priority:** user impact and risk, not the number of lines needed.

Do not treat an old roadmap note or historic test count as current source evidence.

## Re-baselining required

The earlier audit and command matrix contain historical snapshots that predate the R274-R276 work. Re-check their status labels against the current source before using their totals to plan work. The R276 milestone reportedly changed global graph layout behavior, and R274 added open-in-new-tab/open-to-the-right commands; those changes should be reflected in relevant command and feature audits.

The prior matrix mentioned these candidate application gaps: release notes, a trash workflow, and reload behavior. They are **candidates to recheck**, not confirmed open defects in the current working tree. Verify each before retaining it as a live gap.

## Current audit queue

| Area | Next verification | Why it matters |
|---|---|---|
| Command coverage | Compare the command matrix against current command registration and non-empty handlers | Prevents work being planned for an already implemented command. |
| Compatibility shims | Inspect every declared support claim and attach a current regression or reproduction | Prevents plugin compatibility from being overstated. |
| Data safety | Re-run existing autosave, rename/delete, external-edit, and path-boundary tests after relevant changes | These failures can corrupt or lose user notes. |
| Packaging/updater | Verify the release repository, updater endpoint, key pairing, and generated draft | A successful build alone does not validate the update channel. |
| Screenshots | Replace historic UI captures with screenshots from the current desktop build | Public screenshots should describe the current product, not an old development round. |

## Updating this audit

Keep only live gaps here. When a gap is resolved, change its status and link the regression that proves the behavior. Move durable design decisions to [Architecture](ARCHITECTURE.md); do not append a round-by-round transcript.
