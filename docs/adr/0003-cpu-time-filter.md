# ADR 0003 - Time filtering runs on the GPU

**Status:** RESOLVED · decided 2026-09-09, resolved the same day on real hardware
**Supersedes:** the provisional "keep it on the CPU" decision recorded earlier

## Context

The 4D time cursor hides measurements outside a moving window. Two implementations:

1. **CPU filter.** Filter the points array by the cursor each frame and fold an
   age-based alpha into `getFillColor`. deck.gl re-evaluates accessors and re-uploads
   attributes whenever the data reference changes.
2. **GPU filter (`DataFilterExtension`).** Upload each timestamp once as a static
   attribute; each frame changes only a uniform. `filterSoftRange` gives the fade in the
   shader. This is what deck.gl documents for exactly this use case.

## The measurement that nearly led to the wrong answer

Both were benchmarked in headless Chromium, the only browser initially available. It
rasterises with **SwiftShader in software**:

| Implementation | Median frame | FPS |
|---|---|---|
| CPU filter | 66.7 ms | 15.0 |
| GPU filter | 949.9 ms | **1.1** |

On that evidence the GPU filter looks 13x worse, and it was reverted. The suspicion was
recorded at the time: software rasterisation costs roughly 16 µs per point, so drawing
all 60,000 and rejecting them in the fragment shader dominates everything, while the CPU
filter only ever submits the visible subset. That cost is nearly zero on real hardware,
so the comparison should invert.

## Resolution

`measure-perf.mjs` gained a `PERF_GPU=1` mode that launches with a hardware context and
**prints the renderer it actually got**, so a run can be interpreted rather than trusted.
Re-measured at 60,000 points on **Intel UHD Graphics 620 (D3D11)**:

| Implementation | Median frame | FPS | p95 |
|---|---|---|---|
| CPU filter | 33.4 ms | 29.9 | 20.0 |
| **GPU filter** | **16.7 ms** | **59.9** | **59.5** |

The inversion was real and the theory held. The GPU filter is vsync-locked with a p95
essentially equal to its median - it is not merely faster, it is *stable*.

**Decision: ship the GPU filter.** `features/map/layers/index.ts` carries these numbers
at the decision point.

## Consequences

- **The P6 budget is MET**: 60,000 points at 60 fps, on integrated graphics. The plan
  asked for 50k.
- `updateTriggers` for `getFillColor` must never include `timeCursor`. Adding it
  reintroduces the per-frame re-upload and halves the frame rate. There is a comment
  saying so at the code.
- `npm run perf` still defaults to software, which is reproducible and CI-friendly, but
  the output now labels itself unmistakably. **Never quote a software number as a
  hardware result** - that mistake was made here and caught only by re-measuring.
- The wider lesson is about benchmark environments, not deck.gl: a measurement taken in
  an environment that inverts the cost model under test is worse than no measurement,
  because it looks authoritative.
