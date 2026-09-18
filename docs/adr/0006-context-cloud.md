# ADR 0006 — Draw the measurements that did not match

**Status:** Accepted, with a measured cost that is not yet resolved · 2026-09-18
**Relates to:** `UI_POLISH_PLAN.md` §6 / P1.5 · ADR 0003 (GPU time filter) · ADR 0004 (basemap)

## Context

The demo query returns **411 of roughly 1.04 million** measurements. It rendered as 411 dots
in an otherwise empty ocean.

That picture is not just sparse, it is misleading. A viewer cannot distinguish *"this filter
excluded almost everything"* from *"this dataset only ever held 411 points"*. The most
impressive fact about the product — that a sentence in English selected 411 measurements out of
a million — was rendered as an absence, and an absence reads as nothing at all.

## Decision

**Draw the rejected set.** A second registered layer, `context-cloud`, renders the measurements
in the same region and period that did *not* match, dim, small and neutral, beneath the results.

Four properties, each load-bearing:

1. **Neutral, never a colormap.** A context point carries no encoded value. Running it through
   the active colormap would put tens of thousands of meaningful-looking samples on the canvas
   that mean nothing — the same argument `DESIGN.md` makes against a blue basemap. Graphite is
   hue-separated from thermal and haline, so a coloured pixel still always means a match.
2. **Drawn underneath, and not pickable.** Registered between the basemaps and
   `point-cloud-3d`; registration order is draw order. Not pickable because selecting a rejected
   measurement would open an inspector for something absent from the result, and because it
   would intercept picks meant for the matched cloud on top of it.
3. **Same time filter as every other layer**, via the same `DataFilterExtension` uniform. But
   **no `filterSoftRange`** — see below.
4. **Default depth state.** The basemap's `depthCompare: 'always'` escape hatch (ADR 0004)
   exists because geography is a flat backdrop at z=0. Context points are real measurements at
   real negative z and must depth-sort normally.

### The data comes from a second, relaxed query

`bbox`, `time_range` and `wmo_ids` describe *where and when the user looked* and are preserved.
`variable_filters` and `anomaly_codes` are the question's own predicates — the things a
measurement can fail — and are cleared. `filters` on `/query` bypasses the parser, so the
sentence is never re-parsed and cannot drift from the spec.

**`depth_range_m` is widened to a ceiling, not dropped.** This was the subtle one. Dropping it
asks for every level of every profile, the engine hits its 60,000-point limit, returns
`out[:limit]`, and what comes back is an arbitrary prefix presented with full authority.
Measured on the demo fixture, region-wide, for all of 2026:

| context depth | points | complete? | floats | longitude span |
|---|---|---|---|---|
| all depths | 60,000 | **TRUNCATED** | **4 of 12** | −149…−128 |
| 0–300 m | 41,903 | complete | 12 | −170…−128 |
| 0–10 m (as queried) | 993 | complete | 12 | −170…−128 |

300 m is chosen against the science, not the frame: the mixed layer and thermocline both sit
well inside the top 200 m here, and the inspector's derived readouts are computed there. If the
widened query still truncates, it falls back to the query's own depth band, which is complete by
construction. If the **matched** result is itself truncated, the context query is skipped
entirely — the relaxed query would return the same prefix, the set difference would be empty,
and the only outcome would be a second 21 MB request rendering nothing.

## Consequences

**Good.** The filter is visible as a filter. The HUD can say `411 points rendered · 41,492
excluded, shown dim`, which is the actual claim the product wants to make. No contract change,
no backend change; one registered factory per EP-3, resolved through the existing registry.

### Three things measured rather than assumed

**1. The comet tail gutted the layer.** Copying `point-cloud-3d`'s `filterSoftRange` — which
fades the oldest 55% of the window and reads as motion on 411 points — faded most of the context
cloud to nothing. Measured at a 1-year window, 60,000 context points produced a **lit-pixel delta
of 168** against context-off. The hard `filterRange` is what "respects the time cursor" actually
means; recency is a story about the results, not about the scenery.

**2. Depth exaggeration had to change, and this is why the default is now ×6.** `depthToZ`
scales at 0.35°/km, so 300 m of water column at ×1 is 0.105° — about **three pixels** at the
arrival zoom. Every one of a profile's ~350 context points landed in that sliver. At ×6 the
column is ~18 px and reads as a column. The matched cloud is unaffected: those points sit at
3–10 m, under a thousandth of a degree at any exaggeration in range.

**3. It does not fill the frame, because ARGO data is not areal.** This was the premise of the
work and it does not survive contact with the data. The region holds **12 floats and ~119
profiles**; a profile is ~1,000 levels at a *single* lat/lon. The context cloud therefore renders
as vertical combs hanging beneath each float track, not as a haze. Measured contribution at
1920×1080:

```
default arrival frame (30-day trail)   +529 lit pixels
1-year trail                         +4,284 lit pixels
```

The emptiness of the equatorial Pacific in this view is a fact about the ocean and about ARGO's
sampling density, not a rendering defect. Filling it would require inventing measurements.

### The cost, and it is not small

Measured on an Intel UHD 620, hardware GPU, same machine and run order, demo query,
`PERF_CONTEXT=off` as the control (`npm run perf`):

```
context OFF (control)   median 16.9 ms   59.2 fps   MET
context ON              median 33.1 ms   30.2 fps   MISSED
```

**The context layer costs ~16 ms per frame and halves the frame rate.** The cause is overdraw,
not vertex count: a profile stacks ~350 translucent points into an ~18 px column, so those pixels
are blended a hundred times over. The matched cloud renders 60,000 points at 59.9 fps precisely
because they are spread across the frame.

This is a real regression against the P6 budget whenever the layer is on, and the layer defaults
on. It is recorded here rather than resolved because the fix is a design decision the build owner
should make, not a quiet tuning change. The options, in the order I would consider them:

- **Subsample depth levels for the context layer only.** Drawing every 8th level is visually
  near-identical at 18 px and cuts overdraw ~8×. Needs the HUD wording to stop implying every
  excluded point is drawn.
- **Default the layer off** and make it a control the demo turns on deliberately.
- **Accept 30 fps while context is on**, and re-measure on the actual capture machine — the p95
  of ~33 ms is identical in the control, so this machine is dropping vsync frames either way
  (the attribution trap ADR 0003 exists to prevent).

## Alternatives rejected

**Overdraw the matched points instead of computing a set difference.** Simpler, and puts two
primitives at identical coordinates with identical z, letting the depth test decide which wins —
a flicker waiting to happen. The difference is taken on `point_id`, which the contract guarantees
is stable and unique.

**Fetch the context once for the whole dataset and filter client-side.** Would avoid a request
per query, and would mean holding ~1M points in the browser to draw 41k of them.

**Add a lean projection to the wire contract** so context points cost fewer bytes. The 20 MB
response is the honest cost of reusing `/query`, and this is the correct long-term fix — but
contract changes were explicitly out of scope for the UI polish pass.
