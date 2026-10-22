# Screenshot refresh checklist

These images must be captured from the **real current Geode application**. Do not use AI-generated mock UI or screenshots of historical test fixtures as evidence of current behavior.

The existing screenshots are preserved when this ZIP is merged. Refresh them after launching the current branch and confirming the UI is stable.

| Filename | Capture target | Notes |
|---|---|---|
| `geode-desktop-final.png` | Native Tauri window showing the current app and a clean demo vault | No devtools, debug overlays, private paths, or personal notes. |
| `geode-editor.png` | Editor with polished Markdown, internal links, and a representative live-preview state | Use content created for screenshots, not personal vault data. |
| `geode-graph.png` | Current global graph after the R276 radial-layout change | Fit the graph to the window and show enough nodes to explain the feature clearly. |
| `geode-settings.png` | Current Settings UI, including a representative section | Use the final current labels and language. The old `r8-browser-zh-settings.png` name is historical; update the root README when this new image is ready. |
| `geode-plugin-demo.png` *(optional)* | A real, reproducible plugin contribution such as a status-bar or settings surface | Useful product illustration only. It does not replace automated compatibility tests. |

## Suggested capture procedure

1. Start from a clean Git worktree state and run `pnpm typecheck` and `pnpm build`.
2. Launch `pnpm tauri dev` for native desktop captures. Use a dedicated demo vault containing non-sensitive sample notes.
3. Set a consistent window size and theme, close transient dialogs, and verify that graph/editor/settings content is current.
4. Capture the actual window with a screenshot tool or use Playwright only for browser-mode screenshots. Avoid browser-mode screenshots when the image is intended to demonstrate native Tauri behavior.
5. Review text legibility, cropping, duplicate notes, and accidental private paths before committing.
6. Update screenshot links in the root README and remove only image files with no remaining references.

**Important:** `compat-fixtures/` contained plugin source bundles, not screenshot files. Removing that directory does not itself require replacement screenshots. Screenshots are a separate documentation refresh, and they cannot replace runtime regression tests.
