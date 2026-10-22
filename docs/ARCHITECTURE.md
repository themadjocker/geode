# Architecture

## Product boundary

Geode is a local-first Markdown knowledge base. A vault is a user-selected folder containing ordinary files. The application indexes those files and adds editing, navigation, graph visualization, search, workspace management, and plugin support without making a proprietary database the source of truth.

The desktop shell is **Tauri 2**. The UI uses **React and TypeScript**, and the editor is built on **CodeMirror 6**. Browser mode uses an in-memory vault adapter for UI and regression testing; desktop mode exercises the native filesystem boundary.

## Main code areas

| Path | Responsibility | Boundary to preserve |
|---|---|---|
| `src/core/` | Framework-independent models and services, including vault, document, metadata, workspace, command, and update logic | Keep core independent of React feature components. |
| `src/app/` | React application shell, top-level layout, providers, and app-level wiring | Coordinate features without absorbing their domain logic. |
| `src/features/` | User-facing editor, explorer, graph, search, settings, and panel experiences | Features should communicate through core contracts rather than importing one another. |
| `src/plugins/` | First-party Geode plugins | Use the documented Geode plugin contract. |
| `src/compat/obsidian/` | Obsidian-style API compatibility layer | Keep compatibility code isolated from first-party features. |
| `src-tauri/` | Rust/Tauri commands, capabilities, native integrations, and desktop packaging | Treat every native command as a security boundary. |
| `.calibration/` | Browser E2E and probe scripts used during development and CI | Run the specific regression scripts relevant to a change; do not assume every historical script is part of CI. |
| `docs/` | Current design contracts, setup, compatibility scope, release process, and verified gaps | Keep the documentation concise and current. |

This table is a navigation map, not a substitute for the types and implementations. For a change, follow the actual imports and call sites from the feature being edited.

## Important data paths

### Opening and editing a note

1. The vault adapter reads a Markdown file from the active vault.
2. Core document/workspace state tracks the open file and its editor-facing state.
3. CodeMirror provides editing transactions, selections, and extensions.
4. Saving passes through the vault/native adapter boundary in desktop mode; browser mode uses the in-memory adapter.
5. Filesystem change notifications can trigger reconciliation with external edits.

The exact timing and conflict policy belongs in the implementation and regression tests. Do not change save, rename, delete, or watcher behavior based solely on this overview.

### Graph and metadata

Metadata indexing derives links, tags, headings, and other navigation data from vault files. Global and local graph views consume that derived data. The R276 milestone added a configurable circular-force component to the **global** graph layout; local-graph anchor behavior was intended to remain unchanged and was covered by the reported R276 regression suite.

### Plugin compatibility

Native Geode plugins and Obsidian-style plugins are separate entry paths. Compatibility code adapts a subset of Obsidian APIs into Geode services. Compatibility coverage is incremental: a plugin loading successfully is not proof that all of its behavior is supported.

## Invariants for code changes

1. **Vault safety:** avoid path traversal, unintended overwrite, lost edits, and unsafe rename/delete behavior.
2. **Layering:** core remains independent of React; feature modules do not become tightly coupled; compatibility stays isolated.
3. **Explicit async boundaries:** do not block the UI thread with long-running native work. Preserve cancellation, freshness, and error behavior where the existing API provides them.
4. **Compatibility honesty:** unsupported API calls must not silently appear fully supported. Prefer a clear limitation or diagnostic.
5. **Reproducibility:** add or update a regression test for a bug or behavior change where practical.
6. **No secret leakage:** do not commit updater private keys, passwords, private vault data, or generated test artefacts.

## How to update this document

Update this file when a module boundary, data ownership rule, persistence path, or public contract changes. Do not append a full implementation diary for every feature or round. Keep milestone results in [Roadmap](ROADMAP.md), compatibility-specific details in [Obsidian compatibility](OBSIDIAN-COMPAT.md), and performance methodology in [Performance](PERFORMANCE.md).
