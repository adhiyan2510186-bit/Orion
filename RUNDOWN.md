# FloatChat — Build Rundown

A complete inventory of what exists in this repository, verified against the running system on
**2026-09-09**. Where a claim is measured, the measurement is given. Where something is missing,
it is listed under [Gaps](#8-gaps--what-is-not-built).

For *how to resume work*, read `PROGRESS.md`. For *why the architecture is shaped this way*, read
`IMPLEMENTATION_PLAN.md`. This file answers only: **what is built, and does it work?**

---

## 1. Status at a glance

| | |
|---|---|
| **Phases complete** | P1–P7, P9 (8 of 9). P8 not built — deliberate, see §8 |
| **Backend tests** | **78 passed** (`pytest backend/tests -q`, 49 s) |
| **Browser verification** | **18/18 checks** against the live dev server (`npm run verify`) |
| **Performance** | **60,000 points at 60 fps** (median 16.7 ms, p95 59.5 fps), Intel UHD 620 |
| **Real data** | 1,038,872 genuine ARGO measurements · 12 floats · 2023-01-01 → 2026-09-06 |
| **Source size** | ~5,985 lines across Python + TypeScript (excluding generated types) |
| **Network required** | No. Fixtures are committed; `frontend/node_modules` is installed |

---

## 2. Problem-statement coverage

Mapped against the four Round-1 criteria in `PROJECT_CONTEXT.md`.

### 2.1 Interactive WebGL 4D exploration portal — **built**

Four deck.gl layers, each a registered factory rather than hardcoded JSX:

| Layer id | Renders |
|---|---|
| `point-cloud-3d` | Measurements in 3D — X = longitude, Y = latitude, **Z = depth** |
| `trajectory-paths` | Float drift paths over time |
| `depth-columns` | Vertical water-column structure per profile |
| `graticule` | Lat/lon reference grid |
| `basemap-ocean` | Land, coastline and bathymetric contours (default) |
| `basemap-satellite` | NASA Blue Marble raster, topography + bathymetry |
| `ocean-labels` | Ocean and sea names |

- **The 4th dimension** is time: `TimeScrubber` + `usePlayback` drive a time cursor that every
  layer reads. Filtering runs on the GPU via `DataFilterExtension`.
- **Dynamic visual encoding**: points colour-ramp by temperature or salinity using the `thermal`
  and `haline` colormaps defined in `frontend/design/tokens.ts`. Verified painting **94 distinct
  colour buckets**, so the ramp genuinely maps values rather than filling flat.

### 2.2 NL query engine with NetCDF multi-variable parsing — **built, one divergence**

All seven required ARGO variables are ingested and exposed: latitude, longitude, pressure→depth,
sea-water temperature, salinity, timestamp, WMO float id.

`POST /api/v1/query` converts plain English into a structured `QuerySpec`. The parser extracts:

| Dimension | Handles |
|---|---|
| **Region** | 25-entry gazetteer — Niño 3.4, equatorial/tropical Pacific, Atlantic, Indian Ocean, Arabian Sea, Bay of Bengal, Southern Ocean, Arctic, Mediterranean, Gulf of Mexico, Caribbean, hemispheres |
| **Time** | Absolute years, month names/abbreviations, relative windows ("last 6 months") |
| **Depth** | Ranges, "deeper than", "shallower than", surface |
| **Thresholds** | Temperature and salinity comparisons with units |
| **Identity** | WMO float ids |
| **Limits** | Explicit result caps |

It also reports **`unresolved`** — the phrases it could not interpret — plus a `confidence` score
and a human-readable `rationale`. Honest failure rather than silent guessing.

**Divergence from the spec:** the parser is **rule-based, not LLM-driven**. `PROJECT_CONTEXT.md`
asks for LLM tool-calling; no API key exists for this build, so a deterministic parser carries the
demo — no network, no cost, no failure mode mid-demo. It sits behind the `NLPParser` registry
interface, so an LLM parser drops in under `NLP_PARSER=llm` with zero changes elsewhere.
Recorded in `docs/adr/0002-no-llm-parser.md`.

Verified live:

```
"marine heatwaves near the equator"
  → bbox      -5..5 lat, -180..180 lon
  → depth     0–10 m
  → filter    temperature_c > 29.0
  → anomaly   SURFACE_HEATWAVE
  → confidence 0.95
```

### 2.3 Real ARGO telemetry ingestion — **built**

- Source: `https://data-argo.ifremer.fr/dac/<dac>/<wmo>/<wmo>_prof.nc` (HTTPS, no auth).
- 12 floats selected by scanning the 3.4-million-profile global index for the Niño 3.4 box
  (5°S–5°N, 170°W–120°W) and ranking by profile count since 2023.
- Latest profile in the dataset is **2026-09-06** — three days before this build.

Two providers, both behind the `DataProvider` interface:

| Provider | Role |
|---|---|
| `parquet` | Pre-normalised committed fixture. The fast demo path. |
| `netcdf` | Parses raw GDAC `.nc` files directly with xarray/netCDF4. Proves genuine telemetry ingestion. |

Both pass the same shared contract suite. Switch with `DATA_PROVIDER` in `backend/.env` — no code
change, no API change.

### 2.4 Architecture diagram — **built**

`docs/architecture.md` carries Mermaid diagrams for the component/data-flow architecture, the
low-latency spatio-temporal retrieval path, and the ingestion/indexing lifecycle.

### 2.5 Named deliverables

| Deliverable | Status | Where |
|---|---|---|
| NL → geospatial/temporal queries | Built (rule-based) | `backend/app/parsers/rule_parser.py` |
| 4D trajectory renderer | Built | `frontend/features/map/` |
| Thermocline & salinity gradient cross-sections | Built | `backend/app/services/profiles.py`, `DepthProfileChart.tsx` |
| Marine heatwave & anomaly detection | Built | `backend/app/services/anomaly.py` |

---

## 3. Backend

FastAPI + Uvicorn on `:8000`. Layering is strictly one-directional: `api/` → `services/` → `providers/`.

### 3.1 API surface

| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/meta` | Dataset extent, variable descriptors, capabilities, health, example queries |
| `POST` | `/api/v1/query` | `QuerySpec` + `ParseResult` + matching points + summary stats + anomaly tags |
| `GET` | `/api/v1/floats` | Float summaries |
| `GET` | `/api/v1/floats/{wmo_id}/trajectory` | Ordered trajectory points |
| `GET` | `/api/v1/floats/{wmo_id}/profile` | Depth profile with derived diagnostics |

### 3.2 Three registries

Every pluggable family resolves from a registry by string key from config — never a conditional.

| Registry | Registered | Config switch |
|---|---|---|
| Data providers | `parquet`, `netcdf`, `frame` (in-memory base) | `DATA_PROVIDER` |
| NL parsers | `rule` | `NLP_PARSER`, `PARSER_FALLBACK_CHAIN` |
| Anomaly detectors | `surface_heatwave`, `salinity_outlier`, `cold_anomaly` | `ANOMALY_DETECTORS` |

Detector thresholds: surface heatwave >29 °C within 10 m; salinity outlier outside 31–38 PSU;
cold anomaly <20 °C near surface.

### 3.3 Depth-profile science

`services/profiles.py`, method `max-gradient/mld-0.2C-v1`, derives per profile:

- **Thermocline depth** — steepest negative temperature gradient
- **Halocline depth** — steepest absolute salinity gradient
- **Mixed-layer depth** — 0.2 °C threshold criterion
- **Max temperature gradient** (°C/m)

Returns `null` rather than noise when a profile has too few valid levels.

### 3.4 Normalization

All of it happens in providers, at ingestion — never downstream. Pressure→depth conversion,
longitude wrapping, QC-flag scrubbing, sentinel removal (`-999`/`9999` → `null`).

---

## 4. Frontend

Next.js (App Router) + React + deck.gl + Tailwind on `:3000`.

### 4.1 Feature modules

```
features/
  map/          MapCanvas · MapControls · useLayerBuilder
                layers/{registry,index,basemapVector,basemapSatellite,oceanLabels,basemapShared}
  search/       SearchBar · useArgoQuery
  timeline/     TimeScrubber · usePlayback
  inspector/    FloatInspector · DepthProfileChart · useDepthProfile
  anomalies/    AnomalyBadge · useAnomalies
lib/
  api/          client.ts · transport.ts      ← the only layer that performs I/O
  state/        stores.ts (Zustand)
  hooks/        useMeta.ts
design/         tokens.ts                      ← derived from DESIGN.md
```

Layering: `components` → `hooks` → `lib/api` → `transport`. **No React component calls `fetch`.**
Cross-feature imports go through a feature's `index.ts` only.

### 4.2 Design system

`DESIGN.md` ("Chart Room", dark-only) is authoritative and lints clean under
`@google/design.md`. It generates `frontend/design/tokens.ts`, which exports `colors`, `rgb`,
`spacing`, `radius`, `fonts`, `type`, `motion`, `layout` and feeds `tailwind.config.ts`.
No component contains a hardcoded colour, spacing value or type size — re-theming requires zero
component edits.

---

## 5. Contracts

`contracts/*.schema.json` is the **single source of truth**. `frontend/types/argo.ts` and
`backend/app/schemas/argo.py` are generated and must never be hand-edited.

**`argo.schema.json`** — `ArgoFloatPoint`, `DepthProfile`, `ProfileLevel`, `ProfileDerived`,
`FloatTrajectory`, `TrajectoryPoint`, `FloatSummary`, `AnomalyTag`, `GeoBBox`, `TimeRange`,
`VariableDescriptor`, `QCFlag`, `AnomalySeverity`, `DataMode`.

**`query.schema.json`** — `QuerySpec`, `QueryRequest`, `QueryResponse`, `QueryOptions`,
`ParseResult`, `QuerySummary`, `VariableStats`, `VariableFilter`, `DepthRange`, `FilterOp`,
`Aggregation`, `PointPage`, `ProviderMetadata`, `ProviderCapability`, `ResponseMeta`,
`HealthStatus`, `MetaResponse`.

Wire format: `snake_case` in both languages, no translation layer. ISO-8601 UTC with `Z`. Depth is
positive metres downward (`depth_m`). Missing values are `null`.

**Gate:** `make contracts` must produce zero diff on rerun — generation is a pure function of the
schema. Changes are recorded in `contracts/CHANGELOG.md`.

---

## 6. Data

| File | Size | Contents |
|---|---|---|
| `backend/data/samples/argo_equatorial_pacific.parquet` | 5.88 MB | 1,038,872 measurements, 12 floats, 2023+ |
| `backend/data/samples/3902367_prof.nc` | 3.12 MB | One **untouched** GDAC NetCDF file |

The `.nc` file is committed deliberately: it proves the NetCDF provider works on a genuine
unmodified GDAC product offline, not just on data this project pre-cleaned.

`backend/data/raw/` holds all 12 downloaded floats (78 MB, 1,634,607 measurements, 2,366 cycles,
back to 2018-08-12) and is **gitignored**.

Measured dataset extent (live from `/api/v1/meta`):
lat −3.98…5.21 · lon −169.77…−118.00 · depth 2.46…1,988.64 m · 2023-01-01 → 2026-09-06.

**The demo query returns real results.** Of 7,204 surface measurements (<10 m), **743 exceed
29 °C**, peaking at **30.77 °C**, across all 12 floats. Nothing about the marine-heatwave
example is staged.

---

## 7. Verification

### 7.1 Backend — 78 tests

| Suite | Covers |
|---|---|
| `tests/contract/test_contracts.py` | Generated types match the JSON Schema |
| `tests/contract/test_provider_contract.py` | Same suite run against **both** `parquet` and `netcdf` |
| `tests/contract/test_parser_contract.py` | Parser interface conformance |
| `tests/integration/test_api.py` | End-to-end route behaviour |

The shared provider suite is what makes a data-source swap safe.

### 7.2 Frontend — 18/18 in a real browser

`npm run verify` drives headless Chromium against the live dev server:

- Page responds 200 · canvas exists · WebGL context acquired · canvas has real size (1220×763)
- Canvas painted 155,164 lit pixels of 928,420 · 96 distinct colour buckets
- Summary rendered · float count plural (guards a past truncation bug) · anomalies surfaced ·
  no API error banner
- Second query returned results · clicking a painted point opens the depth profile
- Playback control engaged · each of the three basemap styles paints · **no console errors**

**Caveat:** this runs on SwiftShader (software rasterisation), so it proves *correctness*, not
frame rate. Performance numbers come from `PERF_GPU=1 npm run perf` on real hardware.

Screenshots: `frontend/verification/{01-loaded,02-query,03-inspector,04-playback,05-basemap-ocean,06-basemap-satellite}.png`.

### 7.3 Performance

60,000 points at 60 fps — median frame 16.7 ms, Intel UHD 620. Exceeds the 50k target in the
plan, and still holds with the basemap drawn: Ocean, Satellite and the `PERF_BASEMAP=Bare`
control all measure 16.7 ms / 59.9 fps, so the geography costs no measurable frame time. Time filtering runs on the GPU via `DataFilterExtension`; the earlier CPU
approach and why it was initially chosen are recorded in `docs/adr/0003-cpu-time-filter.md`.

---

## 8. Gaps — what is **not** built

Listed honestly. One is a deliberate decision; the rest are drift between what the documentation
claims and what exists.

### 8.1 Deliberate

**P8 — LLM parser.** The only unbuilt phase. No API key exists, so the `rule` parser carries the
demo alone. The registry seam is ready. See `docs/adr/0002-no-llm-parser.md`.

Also out of scope this pass: the semantic vector engine, multi-modal LLM reasoning, and
forecasting from the executive summary of `PROJECT_CONTEXT.md`. All three depend on LLM access.

### 8.2 Documentation drift — claims that are not currently true

| # | Claim | Reality |
|---|---|---|
| 1 | `CLAUDE.md`: "Frontend runs standalone with `NEXT_PUBLIC_TRANSPORT=mock` and the backend stopped" | **Does not work.** `getTransport()` only ever constructs `HttpTransport`; no `MockTransport` exists |
| 2 | `CLAUDE.md`: `make lint` = "ruff + mypy + eslint + import-linter" | Runs **ruff only**. No mypy, no ESLint, no import-linter |
| 3 | `npm run lint` wired to `next lint` | No ESLint config or dependency exists in `frontend/` |
| 4 | `Makefile`: contracts "MUST be clean in CI"; plan: boundaries "*enforced*, not merely documented" | **No CI.** `.github/workflows/` does not exist. The layering is documented, not enforced |
| 5 | Hand-off checklist names 5 ADR topics | 3 ADRs exist (parquet-over-csv, no-llm-parser, cpu-time-filter). Missing: why adapters, why `QuerySpec` as the IR, why JSON Schema codegen, why Zustand, why deck.gl |

Closing 1–4 is roughly: a `MockTransport` over fixture data; ESLint + `eslint-plugin-boundaries`;
import-linter contracts in `pyproject.toml`; a real `make lint`; and a GitHub Actions workflow
running `contracts-check`, `lint` and `test`.

---

## 9. Running it

Two terminals, from the repo root, in **PowerShell**:

```powershell
.\make.ps1 dev-backend     # uvicorn on :8000
.\make.ps1 dev-frontend    # next dev on :3000
```

Open <http://localhost:3000>. The first example query runs automatically.

| Target | Does |
|---|---|
| `.\make.ps1 contracts` | Regenerate TS + Pydantic types |
| `.\make.ps1 contracts-check` | The P1 gate — fails if generated types are stale |
| `.\make.ps1 seed` | Rebuild fixtures from `backend/data/raw` |
| `.\make.ps1 test` | pytest |
| `.\make.ps1 lint` | ruff (see §8.2 #2) |
| `npm run verify` | 18-check browser smoke test |
| `npm run basemap` | rebuild the committed offline basemap assets |
| `PERF_GPU=1 npm run perf` | Frame-rate benchmark on the real GPU |

**Use `make.ps1`, not `make`** — it prepends the portable Node path. `npm` from Git Bash fails
with a "node is not recognized" error, because the npx shim spawns `cmd.exe`, which cannot read
Git Bash's POSIX-form PATH.

No `.env` is needed; defaults are `DATA_PROVIDER=parquet`, `NLP_PARSER=rule`. Copy `.env.example`
to `backend/.env` to switch providers or detectors.

---

## 10. Extension points

`docs/extension-guide.md` documents EP-1…EP-8 with runnable steps. Project skills in
`.claude/skills/` encode the recipes: `/add-provider`, `/add-parser`, `/add-layer`,
`/sync-contracts`, `/ship`.

| EP | Swap | Touch only |
|---|---|---|
| EP-1 | Data source (NetCDF, Parquet, GDAC, PostGIS, vector DB) | `providers/` + registry |
| EP-2 | NL parser (LLM, hybrid, local) | `parsers/` + registry |
| EP-3 | Layer, shader, colormap, basemap style | `features/map/layers/` + registry |
| EP-4 | Theme | `DESIGN.md` → `tokens.ts`. Zero component edits |
| EP-5 | New variable (e.g. dissolved oxygen) | Schema → regenerate → provider |
| EP-6 | Anomaly detector | `services/anomaly.py` + `@register_detector` |
| EP-7 | Scale out | Provider layer |
| EP-8 | API version | `api/v2/` alongside `api/v1/` |

New providers and parsers **must pass the shared contract suite** before being wired in. That
suite is what makes a swap safe.
