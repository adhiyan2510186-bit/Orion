# Build Status

Change log for work done on top of the completed P1–P9 build. For *how to resume*, read
`PROGRESS.md`; for *what exists*, read `RUNDOWN.md`. This file answers: **what changed,
did it pass, and what did it cost?**

Newest first.

---

## 2026-09-09 — Realistic ocean & Earth basemap + style toggle

**Status:** complete, all gates pass.

Replaced the plain black map background with geography drawn beneath the 4D deck.gl
stack, plus a three-way style control. Full rationale in
`docs/adr/0004-offline-basemap.md`.

### What changed

| Area | Change |
|---|---|
| Assets | `frontend/scripts/build-basemap.mjs` (new, `npm run basemap`) downloads Natural Earth + NASA Blue Marble, simplifies, writes `public/basemap/`. Output committed. |
| Layers | `basemapVector.ts`, `basemapSatellite.ts`, `oceanLabels.ts`, `basemapShared.ts` (new) — registered factories, per EP-3 |
| Design | `Basemap` section added to `DESIGN.md` (lints clean); `basemapColors`, `bathymetryRamp`, `bathymetryColor()` added to `design/tokens.ts` |
| State | `useViewStore` gains `basemap: 'ocean' \| 'satellite' \| 'graticule'`; `LayerContext` gains `basemap` |
| UI | Segmented `OCEAN / SATELLITE / BARE` control in `MapControls.tsx` |
| Tests | `verify-ui.mjs` — 15 → 18 checks; `measure-perf.mjs` gains `PERF_BASEMAP` for a control run |
| Cleanup | Removed the stale CPU-time-filter doc block in `layers/index.ts` that contradicted the GPU block below it |

### Two findings that shaped the design

1. **The map is `OrbitView`, not `MapView`.** Carto/Esri/MapLibre tiles assume Web
   Mercator and cannot drop in; adopting them means breaking `depthToZ`, the orbit
   camera, and all four existing layers. But OrbitView's coordinates *are* lon/lat
   degrees, so an equirectangular image maps onto `[-180,-90,180,90]` with **zero**
   reprojection error. The constraint that ruled out tiles is what makes this exact.
2. **Measurements sit at negative z**, so an opaque basemap at z=0 under normal depth
   testing would have hidden the entire point cloud from above. Fixed with
   `depthCompare: 'always'` + first registration (draw order = registration order).

### Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run build` | succeeds |
| `.\make.ps1 contracts-check` | `contracts up to date` — no wire types touched |
| `npm run verify` | **18/18**, including no console errors |
| `designmd lint DESIGN.md` | 0 errors, 0 warnings |

Canvas lit pixels went from **7,710 → 155,164** of 928,420; distinct colour buckets
95–96, so the colormap still maps rather than being flattened by the backdrop.

### Performance — P6 budget still MET, with a control

Intel UHD 620, 60,000 points. `Bare` is the control: the graticule-only state that
existed before this change.

```
Bare (control)   median 16.7 ms   59.9 fps    p95 33.4 ms
Ocean            median 16.7 ms   59.9 fps    p95 33.4 ms
Satellite        median 16.7 ms   59.9 fps    p95 33.4 ms
```

The basemap costs no measurable steady-state frame time. The ~33 ms p95 is **identical
in the control**, so it is this machine dropping the occasional vsync frame, not a
basemap cost.

**Worth recording:** the first perf run after this change reported **33.2 ms median and
looked like a 2× regression**. It was sampling through the one-off decode of the 2.5 MB
raster and tessellation of the contours. `measure-perf.mjs` now settles for 4 s before
sampling. The cold-start cost is real, but it is a load cost, not a frame-rate cost —
the same class of attribution error ADR 0003 was written about.

### Asset budget

49 MB of raw Natural Earth bathymetry → 505 KB after Douglas–Peucker at 0.25°.

```
land.json            63 KB     coastline.json       62 KB
bathymetry.json     505 KB     ocean-labels.json     2 KB
earth-bathy.jpg    2507 KB
                   -------
total              3.06 MB
```

### Known limits

- **Fixed resolution.** 110m vectors and a 5400×2700 raster; zooming deep into a
  coastline shows the limit. Acceptable for a basin-scale instrument.
- **Basin labels are off-frame at the default camera.** Natural Earth anchors names at
  polygon centres, and `NORTH PACIFIC OCEAN` sits near 33°N — outside the equatorial
  view the app opens on. Labels appear as soon as the user zooms out.
- **The basemap does not depth-sort.** Orbiting beneath the sea surface still shows it
  through the water. Deliberate; the alternative occludes the data.
