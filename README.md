# FloatChat

**Natural-language query engine and 4D visualisation for ARGO oceanographic float data.**

Ask *"marine heatwaves near the equator in 2026"* in plain English and get back real
measurements from real robotic floats, rendered as a rotatable 3D water column you can
scrub through time.

Running on **1,038,872 genuine ARGO measurements** from **12 floats** in the equatorial
Pacific, spanning **2023-01-01 to 2026-09-06**.

---

## Quickstart

Two terminals. Windows uses `.\make.ps1`; POSIX systems use `make`.

```powershell
# 1. Backend  ->  http://localhost:8000
py -3.14 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\make.ps1 dev-backend

# 2. Frontend ->  http://localhost:3000
cd frontend; npm install; cd ..
.\make.ps1 dev-frontend
```

Open <http://localhost:3000>. The first example query runs automatically, so the screen
is never empty on arrival.

The committed fixture means **no download is needed to run**. To rebuild it from source
data instead:

```powershell
.\make.ps1 fetch-data   # ~78 MB of real .nc from the Ifremer GDAC -> data/raw (gitignored)
.\make.ps1 seed         # normalise -> data/samples/*.parquet (5.9 MB, committed)
```

## What it does

- **Plain-English querying.** A deterministic parser with a 25-region ocean gazetteer
  turns a sentence into a structured `QuerySpec` — bounding box, depth band, date range,
  thresholds, float ids. It requires **no API key, no network and no per-query cost**,
  so it cannot fail during a demo. Crucially it reports what it *did not* understand
  rather than silently guessing.
- **4D exploration.** deck.gl orbit view with longitude, latitude and depth on the three
  spatial axes, and a time scrubber as the fourth. Older measurements fade as a comet
  tail during playback.
- **Depth profiles.** Click a measurement to get its water column, with the thermocline
  and mixed-layer depth derived and marked.
- **Anomaly detection.** Surface heatwave, salinity outlier and cold-anomaly detectors,
  each emitting machine-readable evidence so a flag can be audited rather than trusted.
- **Two live data backends.** Parquet (fast, the demo path) and NetCDF (parses raw GDAC
  files directly). Both pass the same contract suite; swapping is one env var.

## Try these

| Query | What it exercises |
|---|---|
| `marine heatwaves near the equator in 2026` | Domain concept expanded to a threshold *and* a surface depth band |
| `salinity below 34 between 100 and 500 metres` | Unit-aware disambiguation — metres is a depth, not a temperature |
| `colder than 15 C deeper than 500 m since 2024` | Three constraint families in one sentence |
| `show float 5906548 in the last 6 months` | Float id plus a relative date |
| `sea ice extent near Antarctica last Tuesday` | **Honest failure** — reports what it ignored, low confidence |

## Architecture

```
contracts/*.schema.json          ← single source of truth for every wire type
   ├── gen_typescript.py  →  frontend/types/argo.ts     (generated)
   └── gen_pydantic.py    →  backend/app/schemas/argo.py (generated)

backend/    FastAPI · registries for providers, parsers, detectors
frontend/   Next.js · components → hooks → client → transport
```

Full diagrams in [`docs/architecture.md`](docs/architecture.md). Design system in
[`DESIGN.md`](DESIGN.md). How to extend anything: [`docs/extension-guide.md`](docs/extension-guide.md).

Three ideas carry the whole build:

1. **The schema is the API, and it is checked.** Both languages' types are generated
   from one JSON Schema, and CI fails if a regeneration produces a diff.
2. **Registries, not conditionals.** Data providers, NL parsers, anomaly detectors and
   deck.gl layers are all resolved by string key from config. Adding one is a new file.
3. **Capability negotiation.** Providers declare what they can push down; the query
   engine applies in-process whatever is missing. That is why a naive pandas provider
   and a future PostGIS one can share an interface without either faking anything.

## Commands

```
.\make.ps1 contracts        regenerate both languages' types
.\make.ps1 contracts-check  fail if generated types are stale
.\make.ps1 test             pytest
.\make.ps1 lint             ruff check + format
.\make.ps1 fetch-data       download real ARGO floats
.\make.ps1 seed             rebuild the committed fixture
.\make.ps1 dev-backend      uvicorn on :8000  (docs at /docs)
.\make.ps1 dev-frontend     next dev on :3000
```

Config lives in `backend/.env` — `DATA_PROVIDER`, `NLP_PARSER`, `ANOMALY_DETECTORS`.

## Data provenance and honesty

Data comes from the **Ifremer ARGO GDAC** (`data-argo.ifremer.fr`), unmodified. Three
things the ingestion does that matter scientifically:

- **Prefers `_ADJUSTED` values** wherever a profile is in adjusted or delayed mode.
  Publishing raw values for a delayed-mode profile presents uncalibrated measurements
  as if they were validated.
- **Applies per-variable QC flags at ingestion.** Before this was added, bad-QC levels
  reached the API as salinity from 1.71 to 52.02 PSU — not seawater — and the anomaly
  detector dutifully "discovered" them.
- **Converts pressure to depth with the UNESCO formula**, which is latitude-dependent.
  The naive `depth ≈ pressure × 1.02` is off by several metres at 2000 dbar, enough to
  shift a reported thermocline.

Missing values are `null`, never `-999`. Timestamps are ISO-8601 UTC.

## Status

| | |
|---|---|
| Backend | 78 tests green · ruff clean |
| Contracts | 31 definitions · generation verified idempotent |
| Frontend | `tsc` clean · production build succeeds |
| Not built | LLM parser (deliberate — no API key; the rule parser is the permanent fallback, not a placeholder) |

`ARGO float data were collected and made freely available by the International Argo
Program and the national programmes that contribute to it.`
