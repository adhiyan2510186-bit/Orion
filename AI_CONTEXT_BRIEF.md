# FloatChat — Complete Context Brief for an AI Assistant

> **Purpose of this file.** Paste this whole document into a fresh AI chat to give it full
> context on this project without it reading the repo. It states the original problem, what
> was built, how it is architected, what is verified, what is deliberately missing, and how to
> run it. Everything here was verified against the running system on **2026-09-09**.
> Where a number appears, it is a measurement, not an estimate.

---

## 0. One-paragraph summary

**FloatChat** is a natural-language query engine plus a 4D WebGL visualization platform for
**ARGO oceanographic float data**. A user types plain English — *"marine heatwaves near the
equator in 2026"* — and gets back real measurements from real robotic ocean floats, rendered as
a rotatable 3D water column (longitude × latitude × depth) that can be scrubbed through time.
It is a Python/FastAPI backend + Next.js/deck.gl frontend monorepo, running on **1,038,872
genuine ARGO measurements** from **12 floats** in the equatorial Pacific spanning
**2023-01-01 → 2026-09-06**. It is complete and working end-to-end: 8 of 9 planned phases are
done, 78 backend tests pass, an 18-check real-browser verification passes, and it renders
**60,000 points at 60 fps** on integrated graphics.

---

## 1. Domain background (what ARGO is)

Global ocean climate monitoring relies on thousands of autonomous robotic **ARGO profiling
floats** drifting through the world's oceans. Each float repeatedly sinks to ~2,000 m, then
rises to the surface, sampling **temperature, salinity, and pressure** on the way up. At the
surface it transmits that profile by satellite. One such ascent is a **cycle**; the vertical
series of samples is a **profile**; each float has a unique **WMO id**.

The data is published free and unauthenticated by the **ARGO GDAC** (Global Data Assembly
Centre) as NetCDF files. This project pulls from the Ifremer mirror:
`https://data-argo.ifremer.fr/dac/<dac>/<wmo>/<wmo>_prof.nc`

The scientific problem: this data is enormously valuable but practically inaccessible to
anyone who cannot write xarray code. FloatChat's thesis is that plain English plus a 4D view
closes that gap.

---

## 2. Original problem statement (the requirements this was built against)

### Round 1 technical submission criteria

1. **Interactive WebGL 4D marine data exploration portal**
   - 3D spatial mapping: X = longitude, Y = latitude, **Z = depth/pressure**
   - Time-series scrubbing (the 4th dimension) to watch trajectories and anomalies progress
   - Dynamic visual encoding — colour-code water-column points by temperature/salinity

2. **Natural-language query engine with NetCDF multi-variable parsing**
   - Ingest the standard ARGO variables: latitude, longitude, pressure/depth, sea-water
     temperature, salinity, timestamp, WMO float id
   - Convert natural language into explicit spatio-temporal filters
     (e.g. *"marine heatwaves near the equator in 2026"* → bbox + depth band + threshold)

3. **Demonstration of real ARGO profiling-float telemetry ingestion**
   - A Python pipeline that reads real NetCDF/CSV, or fetches live telemetry from ARGO GDAC

4. **Architecture diagram demonstrating low-latency spatio-temporal retrieval**
   - Mermaid.js diagram of the lifecycle: ingestion → spatial/Parquet indexing → FastAPI query
     router → WebGL client

### Named deliverables

| Deliverable | Status in this build |
|---|---|
| Natural language → geospatial/temporal queries | **Built** (rule-based, see §7) |
| Interactive 4D spatio-temporal trajectory renderer | **Built** |
| Thermocline & salinity-gradient depth-profile cross-sections | **Built** |
| Automated marine heatwave & ocean anomaly detection | **Built** |

### Recommended stack (and what was actually used)

The spec recommended Next.js + Tailwind + deck.gl + Recharts on the front, FastAPI + Uvicorn on
the back, pandas/xarray/netCDF4/NumPy for ingestion, and an LLM with tool-calling for the
parser. **All of it was used except the LLM** — see §7 for why, and note that the seam for
adding one is already in place.

### Explicit extensibility mandate

The problem statement demanded that this be a *foundational baseline for incremental upgrades*,
and specified: feature-based frontend folders, no `fetch` inside React components, centralized
design tokens, an adapter pattern for ingestion (`DataProvider`), a parser separated from the
filtering engine, and matching TypeScript/Pydantic schemas. **This is the reason the codebase
is shaped the way it is** — the modularity is a requirement, not a preference. See §5.

---

## 3. Current status at a glance

| | |
|---|---|
| **Phases complete** | P1–P7 and P9 of a 9-phase plan. **P8 (LLM parser) deliberately not built** |
| **Backend tests** | **78 passed** (`pytest backend/tests -q`, ~49 s) |
| **Browser verification** | **18/18 checks** against a live dev server, headless Chromium |
| **Performance** | **60,000 points at 60 fps** — median frame 16.7 ms, Intel UHD 620 |
| **Real data** | 1,038,872 measurements · 12 floats · 2023-01-01 → 2026-09-06 |
| **Source size** | ~5,985 lines of Python + TypeScript, excluding generated types |
| **Network required to run** | **No.** Fixtures committed, `node_modules` installed, no map tiles fetched |
| **Repo** | `https://github.com/adhiyan2510186-bit/Orion` (public), branch `main` |

---

## 4. Repository layout

```
Orion/
├── contracts/                      ← SINGLE SOURCE OF TRUTH for every wire type
│   ├── argo.schema.json            domain types (14 definitions)
│   ├── query.schema.json           request/response envelope (17 definitions)
│   ├── codegen/gen_typescript.py   → frontend/types/argo.ts      (GENERATED)
│   ├── codegen/gen_pydantic.py     → backend/app/schemas/argo.py (GENERATED)
│   └── CHANGELOG.md                versioned record of every contract change
│
├── backend/                        FastAPI + Uvicorn on :8000
│   ├── app/
│   │   ├── api/v1/router.py        routes only — must not import providers
│   │   ├── services/               query_engine.py · profiles.py · anomaly.py
│   │   ├── providers/              base.py · frame_provider.py · parquet_provider.py
│   │   │                           netcdf_provider.py · registry.py
│   │   ├── parsers/                base.py · rule_parser.py · registry.py
│   │   ├── domain/                 argo_netcdf.py · units.py  (UNESCO pressure→depth)
│   │   ├── schemas/argo.py         GENERATED — never hand-edit
│   │   ├── config.py · container.py · main.py
│   ├── data/
│   │   ├── samples/                COMMITTED fixtures (5.88 MB parquet + 1 raw .nc)
│   │   └── raw/                    12 downloaded floats, 78 MB, GITIGNORED
│   ├── scripts/fetch_gdac.py       downloads real floats from Ifremer
│   ├── scripts/seed_sample_data.py normalises raw .nc → committed parquet fixture
│   └── tests/{contract,integration,unit}/
│
├── frontend/                       Next.js App Router + React 19 + deck.gl 9 on :3000
│   ├── app/                        layout.tsx · page.tsx · globals.css
│   ├── features/
│   │   ├── map/                    MapCanvas · MapControls · useLayerBuilder · layers/
│   │   ├── search/                 SearchBar · useArgoQuery
│   │   ├── timeline/               TimeScrubber · usePlayback
│   │   ├── inspector/              FloatInspector · DepthProfileChart · useDepthProfile
│   │   └── anomalies/              AnomalyBadge · useAnomalies
│   ├── lib/api/                    client.ts · transport.ts  ← the ONLY layer doing I/O
│   ├── lib/state/stores.ts         Zustand
│   ├── design/tokens.ts            derived from DESIGN.md; feeds tailwind.config.ts
│   ├── types/argo.ts               GENERATED — never hand-edit
│   ├── public/basemap/             committed offline geography (3.06 MB)
│   ├── scripts/                    build-basemap.mjs · verify-ui.mjs · measure-perf.mjs
│   └── verification/               6 screenshots of the running app
│
├── docs/
│   ├── architecture.md             Mermaid diagrams (deliverable #4)
│   ├── extension-guide.md          EP-1…EP-8, runnable steps
│   └── adr/                        0001-parquet-over-csv · 0002-no-llm-parser
│                                   0003-cpu-time-filter · 0004-offline-basemap
│
├── DESIGN.md                       design system "Chart Room", dark-only, lints clean
├── IMPLEMENTATION_PLAN.md          AUTHORITATIVE on architecture, schemas, phase order
├── PROJECT_CONTEXT.md              AUTHORITATIVE on requirements (the problem statement)
├── PROGRESS.md                     resume-from-here checkpoint; locked decisions; gotchas
├── RUNDOWN.md                      full inventory of what exists and whether it works
├── BUILD_STATUS.md                 newest-first change log with gate results
├── CLAUDE.md                       operating rules for the AI agent working in this repo
├── Makefile / make.ps1             task runner (use make.ps1 on Windows)
└── .claude/skills/                 /add-provider /add-parser /add-layer /sync-contracts /ship
```

---

## 5. The five architectural rules that shape everything

These are non-negotiable in this repo. They exist so a future teammate can swap a subsystem
without a refactor — which was an explicit requirement of the problem statement.

1. **`contracts/*.schema.json` is the single source of truth for types.**
   `frontend/types/argo.ts` and `backend/app/schemas/argo.py` are **generated**. Never
   hand-edit them. Change the JSON Schema → run `make contracts` → commit the regenerated
   output → record it in `contracts/CHANGELOG.md`. The gate: regeneration must be idempotent
   (zero diff on rerun).

2. **Wire format is `snake_case` in both languages.** No camelCase translation layer anywhere.
   Timestamps are ISO-8601 UTC with `Z`. Depth is **positive metres downward** (`depth_m`).
   Missing values are `null` — never `-999`, `NaN`, or `9999`.

3. **Registries, not conditionals.** Data providers, NL parsers, anomaly detectors and deck.gl
   layer factories are all resolved from a registry by a string key from config. An
   `if provider == "csv"` outside a registry module is a bug.

4. **One-directional layering.**
   - Backend: `api/` → `services/` → `providers/`. Never skip, never reverse.
     Routes must not import providers.
   - Frontend: `components` → `hooks` → `lib/api` → `transport`.
     **No React component may call `fetch`.**

5. **No hardcoded colours, spacing or type sizes in components.** Everything comes from
   `frontend/design/tokens.ts`. Re-theming requires zero component edits.

Plus two more that matter in practice:

6. **Features are isolated** — a file in `features/map/` may import from another feature only
   through that feature's `index.ts`.
7. **Normalization lives in providers**, at ingestion. Unit conversion, longitude wrapping,
   QC-flag scrubbing and sentinel removal happen there, never downstream.

---

## 6. Backend

FastAPI + Uvicorn on `:8000`. Interactive API docs at `/docs`.

### 6.1 API surface

| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/meta` | Dataset extent, variable descriptors, capabilities, health, example queries |
| `POST` | `/api/v1/query` | `QuerySpec` + `ParseResult` + points + summary stats + anomaly tags |
| `GET` | `/api/v1/floats` | Float summaries |
| `GET` | `/api/v1/floats/{wmo_id}/trajectory` | Ordered trajectory points |
| `GET` | `/api/v1/floats/{wmo_id}/profile` | Depth profile with derived diagnostics |

### 6.2 Three registries (all config-switchable, no code change)

| Registry | Registered implementations | Config switch |
|---|---|---|
| Data providers | `parquet`, `netcdf`, `frame` (in-memory base) | `DATA_PROVIDER` |
| NL parsers | `rule` | `NLP_PARSER`, `PARSER_FALLBACK_CHAIN` |
| Anomaly detectors | `surface_heatwave`, `salinity_outlier`, `cold_anomaly` | `ANOMALY_DETECTORS` |

Detector thresholds: surface heatwave `>29 °C within 10 m`; salinity outlier `outside 31–38 PSU`;
cold anomaly `<20 °C near surface`. Each emits **machine-readable evidence**, so a flag can be
audited rather than trusted.

### 6.3 Capability negotiation — the idea that makes providers swappable

Providers **declare** what they can push down (`server_side_filtering`, `aggregation`,
`vector_search`, `streaming`, `live_updates`). The query engine applies in-process whatever the
provider cannot. That is why a naive pandas provider and a future PostGIS provider can share one
interface without either faking anything.

### 6.4 Depth-profile science

`services/profiles.py`, method id `max-gradient/mld-0.2C-v1`, derives per profile:

- **Thermocline depth** — steepest negative temperature gradient
- **Halocline depth** — steepest absolute salinity gradient
- **Mixed-layer depth** — 0.2 °C threshold criterion
- **Max temperature gradient** (°C/m)

Returns `null` rather than noise when a profile has too few valid levels.

### 6.5 Scientific honesty in the ingestion (three things that matter)

- **Prefers `_ADJUSTED` values** wherever a profile is in adjusted or delayed mode. Publishing
  raw values for a delayed-mode profile would present uncalibrated measurements as validated.
- **Applies per-variable QC flags at ingestion.** Before this was added, bad-QC levels reached
  the API as salinity from **1.71 to 52.02 PSU** — not seawater — and the anomaly detector
  dutifully "discovered" them.
- **Converts pressure to depth with the UNESCO formula**, which is latitude-dependent. The naive
  `depth ≈ pressure × 1.02` is off by several metres at 2000 dbar — enough to shift a reported
  thermocline.

---

## 7. The natural-language parser (and its one divergence from the spec)

`POST /api/v1/query` turns plain English into a structured `QuerySpec`. What it extracts:

| Dimension | Handles |
|---|---|
| **Region** | 25-entry ocean gazetteer — Niño 3.4, equatorial/tropical Pacific, Atlantic, Indian Ocean, Arabian Sea, Bay of Bengal, Southern Ocean, Arctic, Mediterranean, Gulf of Mexico, Caribbean, hemispheres |
| **Time** | Absolute years, month names and abbreviations, relative windows ("last 6 months") |
| **Depth** | Ranges, "deeper than", "shallower than", "surface" |
| **Thresholds** | Temperature and salinity comparisons, unit-aware |
| **Identity** | WMO float ids |
| **Limits** | Explicit result caps |

It also returns **`unresolved`** — the phrases it could not interpret — plus a `confidence`
score and a human-readable `rationale`. **Honest failure instead of silent guessing.**

Verified live:

```
"marine heatwaves near the equator"
  → bbox        -5..5 lat, -180..180 lon
  → depth       0–10 m
  → filter      temperature_c > 29.0
  → anomaly     SURFACE_HEATWAVE
  → confidence  0.95
```

### ⚠️ The divergence, stated plainly

`PROJECT_CONTEXT.md` asks for **LLM tool-calling**. This parser is **rule-based and
deterministic**. Reason: **no API key exists for this build**, so an LLM parser could not be
built or tested, and a demo that depends on a network call and a bill has a failure mode a demo
cannot afford. The rule parser requires no API key, no network and no per-query cost, so it
**cannot fail during a demo**.

It sits behind the `NLPParser` registry interface, so an LLM parser drops in under
`NLP_PARSER=llm` with **zero changes anywhere else**. This is recorded in
`docs/adr/0002-no-llm-parser.md`. **This is the single most important thing to know if you are
asked to extend this project** — see §12.

---

## 8. Frontend

Next.js 15 (App Router) + React 19 + deck.gl 9 + Tailwind 4 + Zustand 5 + Recharts on `:3000`.

### 8.1 The 4D view

deck.gl **`OrbitView`** (not `MapView`) with **X = longitude, Y = latitude, Z = depth**, fully
rotatable. The **fourth dimension is time**: `TimeScrubber` + `usePlayback` drive a time cursor
that every layer reads, and time filtering runs **on the GPU** via `DataFilterExtension`. Older
measurements fade as a comet tail during playback.

### 8.2 Registered layers (factories, not hardcoded JSX)

| Layer id | Renders |
|---|---|
| `basemap-ocean` | Land, coastline, bathymetric contours (default) |
| `basemap-satellite` | NASA Blue Marble raster — topography + bathymetry |
| `ocean-labels` | Ocean and sea names |
| `graticule` | Lat/lon reference grid |
| `point-cloud-3d` | Measurements in 3D, colour-ramped by value |
| `trajectory-paths` | Float drift paths over time |
| `depth-columns` | Vertical water-column structure per profile |

Colour encoding uses the **`thermal`** (temperature) and **`haline`** (salinity) colormaps in
`design/tokens.ts`. Verified painting **94–96 distinct colour buckets**, so the ramp genuinely
maps values rather than filling flat.

### 8.3 The offline basemap — a non-obvious design constraint worth knowing

Because the map is an `OrbitView`, **Carto/Esri/MapLibre tiles cannot be dropped in** — they
assume Web Mercator, and adopting them would break `depthToZ`, the orbit camera and all four
data layers. But OrbitView's coordinates *are* lon/lat degrees, so an **equirectangular image
maps onto `[-180,-90,180,90]` with zero reprojection error**. The constraint that ruled out
tiles is what makes this approach exact.

Assets are **built once and committed** (`npm run basemap` → Natural Earth + NASA Blue Marble,
Douglas–Peucker simplified at 0.25°, 49 MB → 505 KB; 3.06 MB total). The app **draws no tiles at
runtime** and needs no network. See `docs/adr/0004-offline-basemap.md`.

A second subtlety: measurements sit at **negative z**, so an opaque basemap at z=0 under normal
depth testing would hide the entire point cloud from above. Fixed with `depthCompare: 'always'`
plus first registration (draw order = registration order).

### 8.4 Design system

`DESIGN.md` — a system called **"Chart Room"**, **dark-only** — is authoritative and lints clean
under Google's `@google/design.md` CLI. It generates `frontend/design/tokens.ts`, which exports
`colors`, `rgb`, `spacing`, `radius`, `fonts`, `type`, `motion`, `layout`, `basemapColors`,
`bathymetryRamp`, and feeds `tailwind.config.ts`. **No component contains a hardcoded colour,
spacing value or type size.**

---

## 9. The contracts (what the wire actually looks like)

31 definitions across two files, contract version **1.0.0**.

**`argo.schema.json` — domain**

```
QCFlag            enum: good | probably_good | probably_bad | bad | changed | estimated | missing | unknown
AnomalySeverity   enum: info | warning | critical
DataMode          enum: real_time | adjusted | delayed | unknown

ArgoFloatPoint    point_id, wmo_id, cycle_number, latitude, longitude, depth_m,
                  pressure_dbar, timestamp, temperature_c, salinity_psu, qc_flag,
                  anomaly_tags, extras
AnomalyTag        code, severity, label, detected_by, evidence
ProfileLevel      depth_m, pressure_dbar, temperature_c, salinity_psu, qc_flag, extras
ProfileDerived    thermocline_depth_m, halocline_depth_m, mixed_layer_depth_m,
                  max_temperature_gradient_c_per_m, surface_temperature_c, method
DepthProfile      wmo_id, cycle_number, timestamp, latitude, longitude, data_mode,
                  levels, derived, anomaly_tags
TrajectoryPoint   cycle_number, latitude, longitude, timestamp, surface_temperature_c
FloatTrajectory   wmo_id, points, start_time, end_time, bbox, cycle_count
FloatSummary      wmo_id, cycle_count, first_seen, last_seen, last_latitude,
                  last_longitude, data_mode
GeoBBox           min_lat, max_lat, min_lon, max_lon
TimeRange         start, end
VariableDescriptor key, display_name, unit, min_value, max_value, colormap, is_extra
```

**`query.schema.json` — envelope**

```
FilterOp           enum: gt | gte | lt | lte | eq | between
Aggregation        enum: none | by_float | by_time_bucket | by_depth_bin
ProviderCapability enum: server_side_filtering | aggregation | vector_search | streaming | live_updates

QuerySpec       bbox, depth_range_m, time_range, variable_filters, wmo_ids,
                anomaly_codes, aggregation, limit
QueryRequest    query (required), filters?, options?
QueryOptions    limit, include_profiles, include_trajectories, parser
ParseResult     spec, confidence, rationale, unresolved, parser_id
QueryResponse   spec, parse, points, trajectories, profiles, summary, anomalies, meta
QuerySummary    answer, matched_points, matched_floats, matched_cycles, time_range,
                depth_range_m, bbox, variable_stats
VariableStats   variable, count, min, max, mean
VariableFilter  variable, op, value, value2
DepthRange      min_m, max_m
ResponseMeta    provider, parser, latency_ms, total_matched, truncated, warnings, schema_version
PointPage       points, total_matched, truncated
ProviderMetadata provider_id, record_count, float_count, bbox, time_range, depth_range_m,
                variables, capabilities
MetaResponse    provider, parser, schema_version, health, example_queries
HealthStatus    healthy, detail
```

Three decisions in the schema worth remembering:

- **`ArgoFloatPoint.extras` is an open map**, so biogeochemical variables can be ingested with
  no schema change. Paired with `VariableDescriptor`, that is what lets a new variable reach the
  UI with **zero frontend work**.
- **`GeoBBox` documents antimeridian wrapping** (`min_lon > max_lon`) as a supported case. The
  sample floats genuinely cross 180°, so this is not hypothetical.
- **`ResponseMeta` reports `provider` and `parser` identity**, which makes swapping either
  implementation *observable* rather than invisible.

---

## 10. The data

| File | Size | Contents |
|---|---|---|
| `backend/data/samples/argo_equatorial_pacific.parquet` | 5.88 MB | 1,038,872 measurements, 12 floats, 2023+ |
| `backend/data/samples/3902367_prof.nc` | 3.12 MB | One **untouched** GDAC NetCDF file |
| `backend/data/raw/` (gitignored) | 78 MB | All 12 floats, 1,634,607 measurements, 2,366 cycles, back to 2018-08-12 |

The raw `.nc` file is committed **deliberately**: it proves the NetCDF provider works on a
genuine unmodified GDAC product offline, not just on data this project pre-cleaned.

**Float selection.** The 12 floats were chosen by scanning the **3.4-million-profile global
ARGO index** for the **Niño 3.4 box (5°S–5°N, 170°W–120°W)** and ranking by profile count since
2023. WMO ids:

```
3902367  3902368  3902370  5905315  5905669  5906014
5906050  5906085  5906236  5906473  5906548  5906822
```

That region was chosen so the *"marine heatwaves near the equator"* example query in the problem
statement returns **real hot water**.

**Measured extent** (live from `/api/v1/meta`):
lat −3.98…5.21 · lon −169.77…−118.00 · depth 2.46…1,988.64 m · 2023-01-01 → 2026-09-06.
The latest profile is **three days older than the build date** — this is current data.

**The demo query is not staged.** Of 7,204 surface measurements (<10 m), **743 exceed 29 °C**,
peaking at **30.77 °C**, across all 12 floats.

---

## 11. Verification (what is actually proven)

### Backend — 78 tests

| Suite | Covers |
|---|---|
| `tests/contract/test_contracts.py` | Generated types match the JSON Schema |
| `tests/contract/test_provider_contract.py` | The **same 14 tests** run against **both** `parquet` and `netcdf` (29 total) |
| `tests/contract/test_parser_contract.py` | Parser interface conformance |
| `tests/integration/test_api.py` | End-to-end route behaviour |

The shared provider suite is what makes a data-source swap safe. A new provider must pass it
before being wired in.

### Frontend — 18/18 in a real browser

`npm run verify` drives headless Chromium against the live dev server and asserts:

- Page responds 200 · canvas exists · WebGL context acquired · real canvas size (1220×763)
- Canvas painted **155,164 lit pixels of 928,420** · **96 distinct colour buckets**
- Summary rendered · float count plural (guards a past truncation bug) · anomalies surfaced ·
  no API error banner
- A second query returns results · clicking a painted point opens the depth profile
- Playback engages · each of the three basemap styles paints · **no console errors**

**Caveat, stated honestly:** this runs on SwiftShader (software rasterisation), so it proves
*correctness*, not frame rate.

### Performance

**60,000 points at 60 fps** — median frame 16.7 ms, p95 59.5 fps, on **Intel UHD 620 integrated
graphics**. That exceeds the 50k target in the plan. It still holds with the basemap drawn:
Ocean, Satellite and a `Bare` control all measure 16.7 ms / 59.9 fps, so the geography costs no
measurable frame time. Real numbers require `PERF_GPU=1 npm run perf`; the software-renderer
mode is not meaningful. `docs/adr/0003-cpu-time-filter.md` records a wrong decision that came
from confusing those two, which is why the distinction is called out everywhere.

---

## 12. What is NOT built — stated honestly

### 12.1 Deliberate

**P8 — the LLM parser.** The only unbuilt phase. No API key exists, so the `rule` parser carries
the demo alone. The registry seam is ready and an LLM parser is a new file plus an env var.
See `docs/adr/0002-no-llm-parser.md`.

Also out of scope this pass, all for the same reason: the **semantic vector engine**,
**multi-modal LLM reasoning**, and **forecasting** from the executive summary of
`PROJECT_CONTEXT.md`. All three depend on LLM access.

Other gaps: **light theme**, **aggregation modes** (`Aggregation` is in the schema but not
implemented).

### 12.2 Documentation drift — claims in the repo that are NOT currently true

These are known and recorded; do not trust the doc over the code on these five points.

| # | Claim somewhere in the docs | Reality |
|---|---|---|
| 1 | "Frontend runs standalone with `NEXT_PUBLIC_TRANSPORT=mock`" | **Does not work.** `getTransport()` only ever constructs `HttpTransport`; no `MockTransport` exists |
| 2 | `make lint` = "ruff + mypy + eslint + import-linter" | Runs **ruff only** |
| 3 | `npm run lint` wired to `next lint` | No ESLint config or dependency exists in `frontend/` |
| 4 | Contracts "MUST be clean in CI"; boundaries "*enforced*" | **There is no CI.** `.github/workflows/` does not exist. Layering is documented, not enforced |
| 5 | Hand-off checklist names 5 ADR topics | Only 4 ADRs exist |

Closing 1–4 is roughly: a `MockTransport` over fixture data; ESLint +
`eslint-plugin-boundaries`; import-linter contracts in `pyproject.toml`; a real `make lint`; and
a GitHub Actions workflow running `contracts-check`, `lint` and `test`.

---

## 13. How to run it

**Windows / PowerShell** (the environment this was built on):

```powershell
# Backend -> http://localhost:8000   (API docs at /docs)
py -3.14 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\make.ps1 dev-backend

# Frontend -> http://localhost:3000
cd frontend; npm install; cd ..
.\make.ps1 dev-frontend
```

Open <http://localhost:3000>. The first example query runs automatically, so the screen is never
empty on arrival. **No `.env` is needed** — defaults are `DATA_PROVIDER=parquet`,
`NLP_PARSER=rule`. Copy `.env.example` → `backend/.env` to switch providers or detectors.

### Task targets

| Target | Does |
|---|---|
| `.\make.ps1 contracts` | Regenerate TS + Pydantic types from the JSON Schema |
| `.\make.ps1 contracts-check` | The P1 gate — fails if generated types are stale |
| `.\make.ps1 test` | pytest |
| `.\make.ps1 lint` | ruff (see §12.2 #2) |
| `.\make.ps1 fetch-data` | Download the 12 real floats from the Ifremer GDAC (~78 MB) |
| `.\make.ps1 seed` | Rebuild the committed fixture from `data/raw` |
| `npm run verify` | 18-check browser smoke test, writes screenshots |
| `npm run basemap` | Rebuild the committed offline basemap assets |
| `PERF_GPU=1 npm run perf` | Frame-rate benchmark on the real GPU |

### Queries to try

| Query | What it exercises |
|---|---|
| `marine heatwaves near the equator in 2026` | Domain concept expanded into a threshold *and* a surface depth band |
| `salinity below 34 between 100 and 500 metres` | Unit-aware disambiguation — metres is a depth, not a temperature |
| `colder than 15 C deeper than 500 m since 2024` | Three constraint families in one sentence |
| `show float 5906548 in the last 6 months` | Float id plus a relative date window |
| `sea ice extent near Antarctica last Tuesday` | **Honest failure** — reports what it ignored, low confidence |

---

## 14. Environment facts and gotchas (they cost real time)

| Thing | Value |
|---|---|
| Python | **3.14.7** at `C:\Python314` (`py -3.14`). Venv at `backend\.venv`, deps installed |
| Key deps | fastapi 0.141.1 · pydantic 2.13.5 · pandas **3.0.5** · numpy **2.5.3** · xarray 2026.7.0 · netCDF4 1.7.4 · pyarrow 25.0.1 · ruff 0.15.1 |
| Node | **v24.20.0**, portable at `%LOCALAPPDATA%\Programs\nodejs`, npm 11.19.0 |
| OS | Windows 10 Home Single Language 10.0.19045 |

- **Node is not on Git Bash's PATH.** Run `npx`/`npm` from **PowerShell**, prepending
  `$env:Path += ";$env:LOCALAPPDATA\Programs\nodejs"`. The npx shim spawns `cmd.exe`, which
  cannot read Git Bash's POSIX-form PATH. **Use `make.ps1`, not `make`** — it handles this.
- **Windows MSI installers fail on this machine.** They are handed `VersionNT = 603` (Win 8.1)
  though the OS is 10.0.19045, so any Win10-gated MSI aborts with 1603. Use portable zips.
- **pandas 3.x and numpy 2.x are major versions.** Copy-on-write is the default, so chained
  assignment silently does nothing. Verify APIs rather than recalling pandas 1.x idioms.

---

## 15. Extension points — how to add things without a refactor

`docs/extension-guide.md` documents these with runnable steps.

| EP | To swap/add | Touch only |
|---|---|---|
| EP-1 | Data source (NetCDF, Parquet, GDAC live, PostGIS, vector DB) | `providers/` + registry |
| EP-2 | NL parser (LLM, hybrid, local Ollama) | `parsers/` + registry |
| EP-3 | deck.gl layer, GLSL shader, colormap, basemap style | `features/map/layers/` + registry |
| EP-4 | Theme | `DESIGN.md` → `tokens.ts`. **Zero component edits** |
| EP-5 | New variable (e.g. dissolved oxygen) | Schema → regenerate → provider |
| EP-6 | Anomaly detector | `services/anomaly.py` + `@register_detector` |
| EP-7 | Scale out | Provider layer |
| EP-8 | API version | `api/v2/` alongside `api/v1/` |

**New providers and parsers must pass the shared contract suite** in `backend/tests/contract/`
before being wired in. That suite is what makes a swap safe.

---

## 16. The three ideas that carry the whole build

If you remember nothing else about this architecture:

1. **The schema is the API, and it is checked.** Both languages' types are generated from one
   JSON Schema, and regeneration must produce zero diff.
2. **Registries, not conditionals.** Providers, parsers, detectors and layers all resolve by
   string key from config. Adding one is a new file, not an edit to a switch statement.
3. **Capability negotiation.** Providers declare what they can push down; the query engine
   applies the rest in-process. That is why a naive pandas provider and a future PostGIS one can
   share an interface without either faking anything.

---

## 17. Attribution

`ARGO float data were collected and made freely available by the International Argo Program and
the national programmes that contribute to it.`
