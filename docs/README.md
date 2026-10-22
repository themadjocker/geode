# Geode documentation

Geode is a local-first Markdown knowledge base built with React, TypeScript, CodeMirror 6, and Tauri 2. Notes remain ordinary files in a folder the user controls.

## Start here

| Goal | Read |
|---|---|
| Understand the design and module boundaries | [Architecture](ARCHITECTURE.md) |
| Install dependencies, run the app, and test a change | [Development](DEVELOPMENT.md) |
| Build and publish a signed Windows release | [Distribution](DISTRIBUTION.md) |
| Understand the Obsidian compatibility boundary | [Obsidian compatibility](OBSIDIAN-COMPAT.md) |
| Author native Geode plugins | [Plugins](PLUGINS.md) |
| Find known gaps and their evidence | [Compatibility gap audit](OBSIDIAN_REPLICA_GAP_AUDIT.md) |
| See active priorities and the latest verified milestone | [Roadmap](ROADMAP.md) |
| Reproduce performance measurements | [Performance](PERFORMANCE.md) |
| Report a security vulnerability | [Security policy](SECURITY.md) |
| Refresh current product screenshots | [Screenshot refresh](SCREENSHOT-REFRESH.md) |
| Check command-level parity | `G3-命令复刻矩阵.md` (retained from the current working tree; audit rows before treating old totals as current) |

## Documentation rules

- Describe the code as it exists today. Put historical context in a short milestone summary, not in the architecture contract.
- Label a behavior **verified** only when a current test or a reproducible manual check supports it.
- Prefer a concise table or link over duplicated explanations.
- Keep setup commands, workflow names, version numbers, and screenshots synchronized with the repository.
- Never place secrets, passwords, private vault data, or signing-key contents in documentation.

## Current snapshot

The latest locally reported milestone in the evidence supplied for this rewrite is **R276 / app version `0.269.0`**. The reported local checks were R23 22/22, R24 12/12, and R276 14/14. These are historical reports, not a claim that tests were executed while preparing this documentation package. Re-run the checks described in [Development](DEVELOPMENT.md) before relying on them after a code change.
