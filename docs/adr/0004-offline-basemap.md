# ADR 0004 — Offline equirectangular basemap, not Mercator tiles

**Status:** Accepted · 2026-09-09
**Supersedes:** the dropped `basemap` control listed in `IMPLEMENTATION_PLAN.md` §4.2

## Context

The map rendered the ARGO point cloud over a plain black field. The only geographic
reference was a drawn 10° graticule, so a viewer could not tell the Pacific from the
Atlantic, or ocean from land. The request was for a realistic Earth/ocean basemap using
something like CartoDB Dark Matter, MapLibre, or the Esri Ocean basemap.

Two facts about this codebase decided the design before any style question came up.

**1. The map is not a Mercator map.** `MapCanvas` renders a deck.gl `OrbitView`, not a
`MapView`, and the reason is recorded in its own comment: the third axis is depth, and
the user needs to rotate the water column to read it. `depthToZ()` scales metres into
**degrees** (`-(depth_m / 1000) * 0.35 * exaggeration`) so depth is commensurate with
longitude and latitude.

Every off-the-shelf basemap — Carto, Esri, MapLibre styles, deck.gl's own `TileLayer` —
assumes Web Mercator. Adopting one means adopting `MapView`, which changes the meaning
of `depthToZ`, the camera model, and the `getPosition` contract of all four existing
layers. That is a rewrite of the feature the basemap was supposed to support.

**2. Offline operation is a guarantee this project has already made**, in `CLAUDE.md`,
`PROGRESS.md`, `README.md`, and ADRs 0001 and 0002 — and the graticule exists *because*
of it ("drawn rather than tiled, so the map works with no network"). A runtime tile
dependency would be the frontend's first, would need a network the rest of the build
does not, and would break the zero-console-errors check in `npm run verify` whenever the
machine is offline.

## Decision

**Bake equirectangular geography into the repo and draw it in OrbitView directly.**

OrbitView's world coordinates *are* degrees of longitude and latitude. That turns the
projection problem into a non-problem: a plate carrée image maps onto
`bounds: [-180, -90, 180, 90]` with **zero reprojection error**, and Natural Earth's
`[lon, lat]` coordinates are used as-is with no projection step at all. The constraint
that ruled out tiles is the same one that makes this exact.

Three styles, resolved through the existing layer registry:

| Mode | Layers | Source |
|---|---|---|
| `ocean` (default) | water plane, bathymetric contours, land fill, coastline, labels | Natural Earth |
| `satellite` | single `BitmapLayer` + labels | NASA Blue Marble, 5400×2700 |
| `graticule` | nothing — the pre-existing bare grid | drawn |

Assets are produced by `npm run basemap` (`frontend/scripts/build-basemap.mjs`),
simplified, and **committed**. Natural Earth publishes bathymetry only at 10m scale, and
the seven contour levels total 49 MB of raw GeoJSON; Douglas–Peucker at a 0.25°
tolerance brings that to **505 KB**. Total committed weight is **3.06 MB**.

### Occlusion: why the basemap disables depth testing

This was the real engineering risk, and it is not obvious. Measurements sit at
**negative z** — a 2000 m float is 0.7 degrees below the z=0 sea surface. Geography
drawn as an opaque plane at z=0 under normal depth testing therefore sits directly on
top of the entire point cloud and hides it from any downward viewing angle. The basemap
would erase the data it exists to contextualise.

Every basemap layer sets `depthCompare: 'always'` and `depthWriteEnabled: false` (the
luma.gl v9 spelling; deck.gl 8's `depthTest: false` silently does nothing in 9.x), and
the basemap modules are imported at the top of `layers/index.ts` so their
`registerLayer` side effects run first. Registration order is draw order, so the
geography paints before the data and can never occlude it, at any camera angle.

The trade-off is accepted deliberately: the basemap does not participate in the 3D depth
sort, so orbiting beneath the surface still shows it through the water. That is correct
for a backdrop — the alternative loses the measurements.

## Consequences

**Good.** No network, no API key, no tile budget, no CSP change; the offline guarantee
is intact. Geometry is exact rather than approximately reprojected. Adding a style is
one registered factory, per EP-3. `contracts/` is untouched, because basemap style is
local UI state that never crosses the wire.

**Costs, stated plainly.**

- **Fixed resolution.** There is no zoom-in detail beyond 110m vectors and a 5400×2700
  raster. Zooming deep into a coastline will show the limit. Acceptable: this is a
  basin-scale instrument, and the floats sit in open ocean.
- **3.06 MB added to a public repo.** Justified against 49 MB raw, and against the
  alternative of a runtime dependency the project has repeatedly refused.
- **Assets are generated, not authored.** `npm run basemap` must be re-run to change
  them, and the output is committed — the same shape as `contracts/` codegen.

**Measured, on an Intel UHD 620 at 60,000 points**, with `Bare` as the control (the
graticule-only state that existed before this change):

```
Bare (control)   median 16.7 ms   59.9 fps      p95 33.4 ms
Ocean            median 16.7 ms   59.9 fps      p95 33.4 ms
Satellite        median 16.7 ms   59.9 fps      p95 33.4 ms
```

The basemap costs no measurable steady-state frame time, and the P6 budget still passes
with it drawn. The ~33 ms p95 is **identical in the control**, so it is this machine
dropping the occasional vsync frame, not a basemap cost — the kind of attribution error
ADR 0003 exists to prevent, which is why `PERF_BASEMAP=Bare` now exists to reproduce the
control.

One honest caveat: the first `PERF_GPU=1 npm run perf` run after this change reported
33.2 ms median and looked like a 2× regression. It was measuring the one-off cost of
decoding the 2.5 MB raster and tessellating the contours *inside the sample window*. The
harness now settles for 4 s before sampling. The cold-start cost is real but it is a
load cost, not a frame-rate cost.

## Alternatives rejected

**Switch to `MapView` and use real Carto/Esri tiles.** The most "realistic" option and
the one that matches how the request was phrased. Rejected because it breaks `depthToZ`,
the orbit camera, and all four existing layers — it trades the 4D water column, which is
this product's entire thesis, for a prettier backdrop.

**Fetch Mercator tiles and un-project each tile to lon/lat bounds.** Workable near the
equator, where the floats are, and wrong by a growing margin toward the poles, since a
tile's latitude span is non-linear. Would also introduce the runtime network dependency
and the console-error risk. Rejected: correct-looking in the demo view and quietly wrong
everywhere else is worse than honestly fixed-resolution.

**A remote equirectangular image from a CDN.** Keeps the repo small, but is still a
runtime network dependency for a single 2.5 MB asset. Not worth breaking the guarantee.
