# ADR 0003 - Time filtering stays on the CPU, provisionally

**Status:** accepted, pending re-measurement on real hardware · 2026-09-09

## Context

The 4D time cursor hides measurements outside a moving window. Two implementations:

1. **CPU filter (shipped).** Filter the points array by the cursor each frame and fold an
   age-based alpha into `getFillColor`. deck.gl re-evaluates accessors and re-uploads
   attributes whenever the data reference changes - the pattern usually blamed for
   scrubbing jank.
2. **GPU filter (`DataFilterExtension`).** Upload the timestamp once as a static
   attribute; each frame changes only a uniform. `filterSoftRange` provides the fade in
   the shader. This is what deck.gl documents for exactly this use case.

Theory says (2) should win decisively. It was implemented and benchmarked.

## Measurement

`npm run perf`, 60,000 points, 140 frames sampled during playback:

| Implementation | Median frame | FPS |
|---|---|---|
| CPU filter | 66.7 ms | **15.0** |
| GPU filter | 949.9 ms | **1.1** |

## Decision

Ship the CPU filter. Keep the GPU version documented and trivially recoverable.

## Why the result is not what it looks like

The benchmark runs in headless Chromium on **SwiftShader**, a software rasteriser
costing roughly 16 µs per point. The GPU filter draws all 60,000 points every frame and
rejects them in the fragment shader, so it pays that cost 60,000 times; the CPU filter
only ever submits the visible subset. On real hardware that per-point cost is orders of
magnitude lower and the comparison likely reverses.

So this is a decision made under measurement constraints, not a finding about deck.gl.

## Consequences

- The shipped path is the only one verified acceptable in the environment available.
  Shipping the alternative would have meant overriding a 13x measured regression on the
  strength of a theory that could not be tested here.
- **Action for anyone with a GPU:** run `npm run perf`, restore the GPU filter (the
  rationale block in `features/map/layers/index.ts` describes it), re-run, and switch if
  it wins. This is a ten-minute task and the expected outcome is that it does.
- The P6 budget - 50k points at 60fps - is therefore **not verified**. Point count is met
  (60,000 render); the frame rate figure is meaningless on a software rasteriser.
