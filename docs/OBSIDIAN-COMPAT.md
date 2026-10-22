# Obsidian compatibility

## Goal and boundary

Geode implements an original compatibility layer for selected public Obsidian plugin APIs. The aim is to help plugins operate against Geode's Markdown vault and workspace model without bundling Obsidian's proprietary code or assets.

Compatibility is incremental. Passing plugin discovery or `onload` does **not** mean that every method, lifecycle event, view, or editor behavior used by that plugin is implemented.

## Where it lives

`src/compat/obsidian/` contains the compatibility shims. Keep them isolated from first-party feature modules. When adding an API, adapt it to a Geode-owned service and preserve a clear boundary around unavailable behavior. Avoid making an unsupported method appear successful if that could cause data loss or hide a broken plugin.

Areas represented in the current project include plugin lifecycle and registration, vault/workspace access, metadata, notices and UI helpers, settings surfaces, Markdown rendering, and CodeMirror-related editor APIs. Exact support varies by method and overload; the implementation and its tests are the source of truth.

## How to evaluate a compatibility gap

For each candidate API:

1. Identify the public API shape and expected behavior from public documentation/types or observable behavior.
2. Search the current shim and existing call sites before implementing a second path.
3. Record the supported subset, return shape, lifecycle timing, and unsupported cases.
4. Add a focused test for normal behavior and relevant failure/cleanup behavior.
5. Prefer a real plugin integration test only when the fixture is licensed, pinned, reproducible, and actually executed by a checked-in test.
6. Re-run core data-safety regressions whenever the change touches vault writes, document transactions, renames, deletion, or filesystem boundaries.

## Testing expectations

Treat the implementation and currently checked-in tests as the source of truth. A compatibility claim should identify the tested API behavior and known unsupported cases. A plugin loading successfully or reporting an enabled status does not prove that its behavior works.

When real-plugin integration coverage is needed, use a pinned, licensed fixture and ensure the test actually runs in CI or is clearly documented as a manual check.
## Legal and data-safety limits

- Do not copy Obsidian proprietary source code, assets, or closed-source plugin code.
- Check a community plugin's license before redistributing its bundle.
- Avoid vault mutation in read-only compatibility tests.
- Do not infer support from a UI element existing or an `enabled` status alone.
- Record unsupported APIs explicitly and keep the scope of claims proportional to verified behavior.

See [the gap audit](OBSIDIAN_REPLICA_GAP_AUDIT.md) for the current review queue and [the roadmap](ROADMAP.md) for product priorities.
