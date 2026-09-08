# Build Progress

Living checkpoint file. **Updated and pushed on every meaningful change**, so that any
interrupted session — usage limit, crash, cold start — can resume from here without re-deriving
anything. If you are a fresh session: read this, then `CLAUDE.md`, then `IMPLEMENTATION_PLAN.md`.

**Status:** environment ready, real data cached, decisions locked · no application code written yet
**Last updated:** 2026-09-09, immediately before build start

**Verified ready:** backend venv installed · 12 real ARGO floats cached locally · demo query
confirmed to return real results · `backend/data/{raw,.venv}` confirmed gitignored ·
`backend/data/samples/**` confirmed committable despite the global `*.nc`/`*.parquet` ignores.

**Network needed?** Backend: **no** — all Python deps are installed and all ARGO data is cached
locally. Frontend: **yes, once** — `npm install` must fetch Next.js, deck.gl and React from the
registry (verified reachable). After that install completes, the whole build is offline-capable.

---

## Locked decisions

Do not reopen these. They were decided with the user and are settled.

| Decision | Choice | Consequence |
|---|---|---|
| NL parser | **Rule-based, no LLM** | No API key exists. `rule` parser must carry the demo alone — gazetteer, dates, thresholds, depths, WMO ids, honest `unresolved`. Never depends on network or a bill. `llm` parser is NOT built. |
| Sample data | **Equatorial Pacific (Niño 3.4 box)** | 5°S–5°N, 170°W–120°W. Makes the "marine heatwaves near the equator" example query in `PROJECT_CONTEXT.md` return real hot water. |
| Build order | **Vertical slice first** | One query end-to-end (type → search → map dots → one chart) before deepening any layer. Every stopping point must be demonstrable. |
| Theme scope | **Dark only** | Per `DESIGN.md`. No light or colorblind-safe theme this pass. |
| Design system | **Chart Room** | `DESIGN.md` is authoritative and lints clean. `frontend/design/tokens.ts` derives from it. |

## Environment (verified 2026-09-09)

| Thing | Value |
|---|---|
| Python | **3.14.7** at `C:\Python314` (`py -3.14`). Venv at `backend\.venv` — **already created, deps installed**. |
| Installed | fastapi 0.141.1 · pandas **3.0.5** · numpy **2.5.3** · xarray 2026.7.0 · netCDF4 1.7.4 · pyarrow · httpx · pytest · pytest-asyncio · ruff |
| Node | **v24.20.0** portable at `%LOCALAPPDATA%\Programs\nodejs`, npm 11.19.0 |
| Git | repo `adhiyan2510186-bit/Orion`, **public**, branch `main` |

**Gotchas that cost time if forgotten:**

- **Node is not on the Bash tool's PATH.** Run `npx`/`npm` from **PowerShell**, prepending
  `$env:Path += ";$env:LOCALAPPDATA\Programs\nodejs"`. The npx shim spawns `cmd.exe`, which cannot
  read Git Bash's POSIX-form PATH (`'"node"' is not recognized`).
- **Windows MSI installers fail on this machine.** They are handed `VersionNT = 603` (Win 8.1)
  though the OS is 10.0.19045, so any Win10-gated MSI aborts with 1603. Use portable zips.
- **pandas 3.x and numpy 2.x are majors.** Copy-on-write is default; do not write chained
  assignment. Verify APIs rather than recalling pandas 1.x idioms.

## Real ARGO data — downloaded and verified

Source: `https://data-argo.ifremer.fr/dac/<dac>/<wmo>/<wmo>_prof.nc` (HTTPS, reachable, no auth).
Global index `ar_index_global_prof.txt.gz` is 58.5 MB gz / 3.4 M profiles.

**12 real floats are already downloaded to `backend/data/raw/` (78 MB, gitignored).**
The build needs **no network** — extract fixtures from these. Selected by scanning the global
index for the Niño 3.4 box (5°S–5°N, 170°W–120°W) and ranking by profile count since 2023:

```
3902367  3902368  3902370  5905315  5905669  5906014
5906050  5906085  5906236  5906473  5906548  5906822
```

Combined: **1,634,607 measurements · 2,366 cycles · 2018-08-12 → 2026-09-06** (three days old).

**The demo query is verified to work on real data.** Of 7,204 surface measurements (<10 m),
**743 exceed 29 °C**, peaking at **30.77 °C**, across all 12 floats. The
"marine heatwaves near the equator" example returns genuine hot water, not a staged result.

### Fixture plan (measured, zstd Parquet)

| Window | Rows | Cycles | Size |
|---|---|---|---|
| all | 1,634,607 | 2,366 | 8.52 MB |
| **2023+ ← use this** | 1,038,872 | 1,567 | **5.35 MB** |
| 2024+ | 756,732 | 1,143 | 4.03 MB |

Commit `2023+` Parquet (~5.4 MB) **plus one untouched raw `.nc`** (3902367, 3.12 MB) so the
NetCDF provider is provably exercised on a genuine unmodified GDAC file offline. ~8.5 MB total.

> **Plan deviation — the v0 provider reads Parquet, not CSV.** `IMPLEMENTATION_PLAN.md` P3 names a
> `csv` provider. The same data as CSV is **159 MB** versus 5.35 MB as zstd Parquet, so CSV is not
> a viable committed fixture. Keep a tiny hand-written CSV for unit tests; the demo fixture and
> default `DATA_PROVIDER` are Parquet. Update the plan and record an ADR during build.

Structure confirmed by opening a real file with xarray. **These details will silently corrupt
ingestion if ignored:**

- Dims: `N_PROF` (profiles) × `N_LEVELS` (depth bins). `PRES`/`TEMP`/`PSAL` are 2-D float32,
  NaN-filled to the ragged max.
- `PLATFORM_NUMBER` is **`object` dtype wrapping `np.bytes_`**, not `'S'` dtype. A
  `dtype.kind == "S"` check *silently fails* and yields ids like `np.bytes_(b'3902367 ')`.
  Already hit this once. Working decoder:
  ```python
  a = np.asarray(v)
  if a.dtype == object:
      a = np.array([x.decode() if isinstance(x, (bytes, np.bytes_)) else str(x)
                    for x in a.ravel()])
  elif a.dtype.kind == "S":
      a = a.astype(str)
  ids = np.char.strip(a.astype(str))
  ```
- `CYCLE_NUMBER` is **float64**, not int — cast explicitly.
- `JULD` arrives as `datetime64[ns]` (xarray decodes it); may be NaT.
- QC variables (`*_QC`, `POSITION_QC`, `JULD_QC`) are byte chars `'1'`–`'9'`.
- `DATA_MODE` is `R`/`A`/`D`. **`*_ADJUSTED` variants exist and are the scientifically correct
  values for `A` and `D` modes** — prefer them, fall back to raw for `R`. Getting this wrong means
  publishing uncalibrated measurements as if they were validated.
- Pressure is **decibar**; convert to `depth_m` positive-down in the provider, keep `pressure_dbar`.
- **These floats cross the antimeridian** — observed longitude spans −179.5 … +179.7. A bbox
  query crossing 180° is a real case in this dataset, not a hypothetical. `min_lon > max_lon` must
  be handled as a wrapped range (two spans OR-ed), or equatorial Pacific queries silently drop
  half their results.

## Phase status

Gates come from `IMPLEMENTATION_PLAN.md`. A phase is complete only when its gate **actually
passes** — never mark one done on assumption.

| Phase | Deliverable | Gate | Status |
|---|---|---|---|
| P0 | Environment, deps, real-data recon | stack imports; real `.nc` parsed | **DONE** |
| P1 | `contracts/` frozen + codegen | `make contracts` twice, zero diff | not started |
| P2 | FastAPI skeleton, `/meta` `/query` | contract tests vs `NullProvider` | not started |
| P3 | CSV provider + rule parser + engine | contract suite green for `csv` | not started |
| P4 | Frontend shell, API client, mock transport | UI renders with backend off | not started |
| P5 | NetCDF provider + real ARGO fixtures | same suite green for `netcdf` | not started |
| P6 | deck.gl 3D map + time scrubbing | 50k pts @ 60fps; cursor drives layers | not started |
| P7 | Inspector: depth profiles, thermocline | click float → profile renders | not started |
| P8 | LLM parser | **SKIPPED — no API key (locked decision)** | n/a |
| P9 | Anomaly detectors, summarizer, docs | full e2e | not started |

**Vertical slice overrides strict phase order:** reach a working query as early as possible
(P1 → minimal P2 → minimal P3 → minimal P4 → minimal P6), push, then deepen in passes.

## Current position

**Next action:** P1 — write `contracts/argo.schema.json` and both codegen scripts.

Nothing is half-finished. The working tree is clean.

## Push protocol

`main` only ever receives commits that boot. Anything mid-change goes to a `wip/<topic>` branch
instead, so the public repo's default branch stays green. Update this file in the same commit as
the work it describes. Conventional commit messages, scopes per `CLAUDE.md`.

## Open questions for the user

None blocking. Recorded here if any arise mid-build.
