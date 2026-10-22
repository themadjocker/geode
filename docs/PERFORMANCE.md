# Performance

## Benchmark mode

The application has a deterministic in-memory benchmark vault that can be opened in browser mode with a query such as:

```text
http://localhost:1420/?bench=10000
```

The seed is synthetic and should not write to a user's real vault. Use the same browser, visibility state, vault size, and measurement method when comparing runs. Background/occluded pages can throttle `requestAnimationFrame`, so do not compare hidden-tab frame timings with visible-page results.

## What the existing baseline showed

The historical profiling notes identified **unbounded rendered DOM** as a major source of latency for large vaults, rather than the metadata scan alone. Existing mitigations include a result cap in the quick switcher, a rendered-result cap in full-text search, explorer row virtualization for large trees, and sampling/render-on-demand techniques for the graph.

Older reference measurements reported:

| Operation | Historical reference |
|---|---:|
| Quick switcher open at 10k notes after result cap | 15 ms |
| Full-text search worst-case UI path after render cap | 347 ms |
| Explorer expand-all after virtualization | 10 ms |
| R276 graph settle, bench=10k with 3k sampled nodes | 4,587 ms |
| R276 graph draw | 1.7 ms |

These numbers come from historical notes and single-run measurements. They are **not a fresh benchmark of the current working tree** and should not be used as a performance guarantee. Re-run them before making a claim about current performance.

## Measurement rules

1. Record commit/version, OS, browser, vault size, and whether the page was visible.
2. Measure user-visible completion, not only a fast inner function.
3. Separate initialization/seed cost from indexing, filtering, rendering, and graph settling where instrumentation allows.
4. Repeat a representative run and report spread or caveats instead of quoting a single number as universal.
5. Keep a smaller-vault control case to catch regressions hidden by large-vault optimizations.
6. Verify visual behavior and responsiveness alongside timings. A faster frame that omits important content is not automatically an improvement.

## Before optimizing

Profile first. Prefer reducing unnecessary work and unbounded DOM over introducing a new dependency or abstraction. Keep the normal small-vault experience intact when optimizing large vaults. Revisit worker/WebGL approaches only when current measurements show that the existing capped Canvas2D path is insufficient for a clear user requirement.
