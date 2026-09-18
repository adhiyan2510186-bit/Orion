# ADR 0007 — Give the canvas a ground; deep water may take a cool cast

**Status:** Accepted · 2026-09-18
**Amends:** `DESIGN.md` *Basemap* ("the ocean is not blue") and *Canvas* (atmosphere budgets)
**Relates to:** ADR 0004 (offline basemap) · ADR 0003 (measure with a control)

## Context

The UI read as plain black, and the cause was measurable rather than aesthetic. Reading the
WebGL framebuffer at 1920×1080 on the default `ocean` style:

```
                 p25    median  p75    p95    IQR    mean chroma
Ocean (default)   9.9     9.9    9.9   13.9    0.0      2.94
Satellite         4.4     7.1   11.7   22.6    7.3     22.21
```

**Three-quarters of the canvas was a single luminance value.** Not a narrow range — one value.

Four things combined to produce that:

1. The ocean was one opaque quad at `#090A0C` with no variation.
2. Bathymetry *was* drawn — 631 closed rings, all seven levels — but as `PathLayer` strokes
   **0.7 px wide** with a 0.5 px floor. Sub-pixel lines whose deep steps sat 10–22/255 above
   the plane beneath them.
3. `bathymetryRamp` darkened with depth so the abyssal plain would be "the quietest thing in
   the frame". This dataset sits entirely over abyssal plain, so the quietest thing in the
   frame *was* the frame.
4. Grain (3.5%) and vignette (32%) were therefore worth ~4 and ~3 luminance levels over a
   ground of 9.9, and had measured as no-ops twice.

## Decision

**Give the water a ground.** Three changes, canvas only — no chrome token moved.

### 1. Depth tinting

The contour rings are now **filled** as well as stroked (`basemapVector.ts`, inside the existing
ordered array so the bands paint between the shelf plane and the contour line work).

Contour rings enclose water *deeper* than their level and they nest. Painting shallow-first
lets each deeper band nest on top, so the visible colour at any pixel is its deepest enclosing
contour. This relies on `bathymetry.json` already being ascending by depth, which it is because
`build-basemap.mjs:32` iterates `BATHY_LEVELS` shallow-to-deep — stated in the layer so
reordering that constant cannot silently invert the tinting.

`basemapColors.ocean` changed from `#090A0C` to `#4A463D` and **changed meaning**. Once the
bands are filled, the plane is only what the 200 m ring does not cover — which is *shelf*, not
abyss, so it is now the lightest tone rather than the darkest. Verified before relying on it:
probes in the N Atlantic, S Pacific, Indian, Southern, N Pacific, Arctic and equatorial Pacific
all fall inside a 200 m ring; a coastal probe off California falls outside.

### 2. Ocean relief, and the amendment to "the ocean is not blue"

Depth tinting alone is not enough **in this view**. The demo frame sits inside the 4000 m ring
with 5000 m to the west, so the vector contours can produce only **two tones** across it. The
per-pixel structure has to come from `public/basemap/earth-bathy.jpg` — NASA Blue Marble
topo+bathymetry, already committed, previously drawn only in satellite mode.

It is now drawn under the `ocean` style too, **desaturated in a fragment shader** and held at
0.38 opacity over the depth bands.

This is where `DESIGN.md`'s rule bends, so the bend is bounded explicitly. The rule exists so a
viewer never has to learn which blues are water and which are a `haline` sample. The raster's
own mean chroma over the framed region is **22.2**; this work is held to **≤ 8**. So the
luminance structure is kept, most of the chroma is discarded (`reliefSaturation: 0.22`), and
the permitted cool cast is re-introduced through `bathymetryRamp` instead — one place governs
hue. Per-step ramp chroma peaks at 11/255 against a `haline` low-end sample of `[41,24,107]`,
whose chroma is 83. A basemap pixel cannot be mistaken for a measurement.

`tintColor` on `BitmapLayer` cannot do this: it multiplies, and multiplying by a grey scales
all three channels equally — that changes brightness and leaves saturation untouched.
Desaturation is a mix toward luminance, which needs a fragment hook.

### 3. Contours made to read

`getWidth` 0.7 → **1.2**, `widthMinPixels` 0.5 → **0.9**, via `basemapDetail` tokens.

## Result, measured

```
                          before    after    target
interquartile spread        0.0      8.8      >= 6
mean chroma                 2.94     6.47     <= 8
distinct luminance levels   ~1       206      >= 6
```

## Consequences

### The atmosphere budgets are UNCHANGED, and that is the finding

The plan was to re-derive the grain and vignette ceilings against the new ground. Re-deriving
them says to leave them alone.

`DESIGN.md` justifies both caps in terms of the **measurements**, not the ground: grain under
4% because "above that it starts competing with the dimmest measurements", vignette under 35%
because beyond that it "begins hiding measurements near the frame edge". The measurements did
not change. What changed is that the effects finally have something to act on — at a ground of
~21, vignette at 0.32 darkens the corners by ~6.7 levels instead of ~3.2, and grain lifts by up
to ~8 instead of ~4. **The budgets were never the problem; the ground was.** Raising them now
would do precisely what their stated reason forbids.

### Additive blending is turned off

`canvasAtmosphere.additiveBlending` → `false`. Measured colormap hue retention over the new
ground, demo query, 1-year trail:

```
additive ON     33.3%
additive OFF    71.3%
```

`DESIGN.md` predicted this in as many words — additive "composites poorly over bright ground",
which is the stated reason satellite imagery is capped at 55%. Over the old near-black ground
additive cost 30 points of hue (76.4% → 46.9%); over the new ground it costs 38. At demo
framing the two are visually near-identical, because only ~20 points are on screen at the
default 30-day trail. It was buying nothing and costing legibility. One token restores it.

### Two `verify` checks stopped discriminating

The suite reports **18/18**, and that number should not be read as success. The lit-pixel
threshold is `r+g+b > 40`; `#090A0C` summed to 31, so the ocean plane was never counted.
The new ground crosses it, so:

```
canvas painted non-background pixels   877,384 of 878,400   (99.9% of the frame)
basemap Ocean paints                   878,400 lit (> 20000)
```

`canvas painted non-background pixels` would now pass **with zero data drawn**, and the Ocean
floor that P1.5 left failing now passes for entirely the wrong reason. Both need re-anchoring —
count pixels above the basemap's own ground level, or count saturated pixels, which only data
produces. Per `UI_POLISH_PLAN.md` §3.5 that is a deliberate change to the gate, so it is
recorded here and left for the build owner rather than absorbed.

### Cost: none measurable

`PERF_GPU=1`, Intel UHD 620, idle machine, demo query:

```
context off   16.7 ms   59.9 fps   MET
context on    16.9 ms   59.2 fps   MET
```

The heavier basemap — an extra `PolygonLayer` over 33k vertices plus a shader-injected
`BitmapLayer` — costs nothing at steady state.

This run also **corrects two earlier numbers**, both of which were machine contention rather
than code, which is the trap ADR 0003 exists to prevent:

- P1.5 recorded the context cloud costing ~16 ms/frame (59.2 → 30.2 fps). Back-to-back on an
  idle machine the delta is **0.2 ms**. That open question is closed.
- P3 recorded 30.0 fps for every configuration including a stashed baseline. The same code now
  measures 59.9 fps.

## Alternatives rejected

**Make Satellite the default.** The biggest visual change for the least code, and it reverses
"never the default" outright — the deep-navy imagery collides with `haline` and `viridis` at
full chroma. Desaturating the same raster to a ground texture keeps the structure and discards
the collision.

**Reverse the bathymetry ramp so deep water is lighter.** Would have solved the flat frame in
one token, and would read as wrong to anyone who has seen a chart. Lifting the floor and
stretching the deep end achieves the same contrast while keeping the convention.

**Re-run `npm run basemap` at a finer simplification tolerance** (0.25° → 0.1°) or restore more
of Natural Earth's twelve contour levels. Both need network, and neither helps here: the
dropped levels are deeper than 6000 m, and the framed region is genuinely featureless abyssal
plain. The structure is not in the vector data at any tolerance.
