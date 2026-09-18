# Build Progress

Living checkpoint file. **Updated and pushed on every meaningful change**, so that any
interrupted session — usage limit, crash, cold start — can resume from here without re-deriving
anything. If you are a fresh session: read this, then `CLAUDE.md`, then `IMPLEMENTATION_PLAN.md`.

**Status:** P1–P7 + P9 complete. Full vertical slice runs end to end on real data.
Now in a **frontend-only UI polish pass** for a recorded demo — plan and phase list in
`UI_POLISH_PLAN.md`. **P0, P1, P1.5 and P3 done**; all on `wip/p15-framing`, NOT on
`main`, because P1.5 left two gates open — see "Open questions". **P2 (the parse ribbon)
was skipped on instruction** and is the remaining polish phase, along with what is left
of P3 (scripted demo camera; §3.7's `viewState` hoist is still not needed).
**Last updated:** 2026-09-18, after the canvas-ground pass (see `UI_POLISH_PLAN.md` §9
and ADR 0007)

**Verified ready:** backend venv installed · 12 real ARGO floats cached locally · demo query
confirmed to return real results · `backend/data/{raw,.venv}` confirmed gitignored ·
`backend/data/samples/**` confirmed committable despite the global `*.nc`/`*.parquet` ignores.

**Network needed?** Backend: **no** — all Python deps are installed and all ARGO data is cached
locally. Frontend: **yes, once** — `npm install` must fetch Next.js, deck.gl and React from the
registry (verified reachable); `npm run basemap` fetches the Natural Earth / NASA basemap
assets and `npm run fonts` fetches the three type families. All three outputs are committed, so
after they complete the whole build is offline-capable. The map draws no tiles at runtime (see
`docs/adr/0004-offline-basemap.md`) and **the fonts are self-hosted as of UI polish P1** — the
`fonts.googleapis.com` import is gone, so there is now no runtime network dependency at all.

---

## Locked decisions

Do not reopen these. They were decided with the user and are settled.

| Decision | Choice | Consequence |
|---|---|---|
| NL parser | **Rule-based, no LLM** | No API key exists. `rule` parser must carry the demo alone — gazetteer, dates, thresholds, depths, WMO ids, honest `unresolved`. Never depends on network or a bill. `llm` parser is NOT built. |
| Sample data | **Equatorial Pacific (Niño 3.4 box)** | 5°S–5°N, 170°W–120°W. Makes the "marine heatwaves near the equator" example query in `PROJECT_CONTEXT.md` return real hot water. |
| Build order | **Vertical slice first** | One query end-to-end (type → search → map dots → one chart) before deepening any layer. Every stopping point must be demonstrable. |
| Theme scope | **Dark only** | Per `DESIGN.md`. No light or colorblind-safe theme this pass. |
| Design system | **Chart Room** | `DESIGN.md` is authoritative and lints clean. `frontend/design/tokens.ts` derives from it **by hand** — that step is still manual, and there is no `tailwind.config.ts` (this is Tailwind v4). Everything downstream of `tokens.ts` is **generated**: `scripts/build-theme.mjs` writes `app/theme.generated.css` (the `@theme` block, the type scale, the spacing base and the semantic utilities). The palette is no longer duplicated by hand — change it in `DESIGN.md` and `tokens.ts`, then `npm run theme`. |
| Theme direction | **Austere instrument, cinematic canvas** | Chrome stays flat, warm, matte; glow/grain/vignette/additive belong inside the WebGL viewport only. Glass is permitted at the boundary alone. The no-blue-chrome rule survives. |
| Motion | **Explanatory only** | Replaced the "don't animate the interface" rule. Motion must explain a causal relationship; decoration does not ship. `transform`/`opacity` only. See ADR 0005. |
| Context cloud | **Draw what did not match** | Showing only survivors renders a filter as an absence. A registered `context-cloud` layer draws the rejected measurements dim and neutral beneath the results, from a second relaxed query. Default on. See ADR 0006 — including a measured frame cost that is still open. |
| Arrival camera | **Top-down, then ease to 35° over 2.5 s** | A plan view reads as a map, an oblique one as a volume; the rotation is what says the third axis exists. **Diverges from `DESIGN.md`'s 240–520 ms band** on the build owner's instruction — the band protects chrome, and the canvas is explicitly exempt from the instrument's austerity. Value and argument in `tokens.camera`. |
| Additive blending | **OFF** | Built and measured in P3, then turned off once the ground was lifted. `DESIGN.md` predicted it: additive "composites poorly over bright ground". Colormap hue retention 46.9% (on) vs 71.3% (off) over the new ground, for a difference that is visually negligible at demo framing. One token restores it. See ADR 0007. |
| Canvas ground | **Depth tinting + desaturated NASA relief** | The canvas was a single luminance value across 75% of the frame. Contour rings are now filled, not just stroked, and the committed topo+bathymetry raster is drawn desaturated beneath the default style. Deep water takes a bounded cool cast (mean chroma ≤ 8; measured 6.47). Amends `DESIGN.md`'s "the ocean is not blue". See ADR 0007. |

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
| P1 | `contracts/` frozen + codegen | regenerate twice, zero diff | **DONE** — 31 defs |
| P2 | FastAPI skeleton, `/meta` `/query` | contract tests pass | **DONE** |
| P3 | Provider + rule parser + engine | contract suite green | **DONE** — see deviation below |
| P4 | Frontend shell, API client, transport | UI renders | **DONE** |
| P5 | NetCDF provider + real fixtures | same suite green for `netcdf` | **DONE** — 29 tests, 14 per provider |
| P6 | deck.gl 3D map + time scrubbing | 50k pts @ 60fps | **DONE — gate MET**: 60k @ 60fps on Intel UHD 620 |
| P7 | Inspector: profiles, thermocline | click float → profile renders | **DONE** |
| P8 | LLM parser | — | **SKIPPED** — ADR 0002, no API key |
| P9 | Detectors, docs, ADRs | full e2e | **DONE** |

### Verified

- **78 backend tests green**, ruff clean, `tsc --noEmit` clean, `next build` succeeds.
- **`npm run verify` 18/18** in a real browser, including no console errors, after the basemap
  and again after UI polish P1 — picking still works through the new canvas overlays.
- **Basemap costs no frame time**: 60k points hold 59.9 fps in all three styles, measured
  against a `PERF_BASEMAP=Bare` control. See `BUILD_STATUS.md`.
- Both providers pass the *same* 14-test contract suite. `DATA_PROVIDER=netcdf` serves
  64,606 measurements straight from a raw unmodified GDAC file.
- Query latency 63 ms (411 results) to 311 ms (472k-row scan) on the real fixture.
- CORS preflight verified for the browser's actual request pattern.

### Not verified — be honest about these

- No frontend unit tests. The Playwright smoke test (`npm run verify`, 18 checks) plus
  `tsc` and the production build are the guards.
- Aggregation modes (`by_float`, `by_time_bucket`) exist in `QuerySpec` but the engine
  ignores them. `list_floats` ignores its spec argument.

### Resolved since

- **P6 performance gate: MET.** 60,000 points at 60 fps (median 16.7 ms, p95 59.5 fps)
  on Intel UHD 620, using GPU-side time filtering. The earlier "not verified" note came
  from benchmarking on a software rasteriser, which *inverted* the result and made the
  correct implementation look 13x worse. Re-measured on hardware; see ADR 0003.

**Vertical slice complete.** A query now runs from typed sentence to rendered 4D cloud.

## Current position

**Next actions, highest value first:**

0. **Settle the two open gates from P1.5** (see "Open questions"). `wip/p15-framing`
   cannot merge to `main` until then.
1. **Re-measure perf on an idle machine.** P3's A/B is flat, but the absolute frame
   rate could not be established — the machine's own Chrome was holding the GPU, and
   the same control read 59.2 fps earlier in the day and 30.0 fps later with identical
   code. `UI_POLISH_PLAN.md` §8.4. This is also the right condition for the recording.
2. **UI polish P2 — the parse ribbon.** Skipped on instruction, still outstanding.
   `UI_POLISH_PLAN.md` §2 P2 and §5.3. Needs `features/search/index.ts` (barrel) and
   `features/search/lib/attributeSpec.ts`.
3. **P3 leftovers:** the scripted demo camera. Additive blending, point entry and the
   arrival flight are done; `viewState` still does not need hoisting (§3.7).
3. Optional depth: aggregation modes (`by_float`, `by_time_bucket`) are in `QuerySpec`
   but the engine ignores them; `list_floats` ignores its spec argument.
4. Optional: a light theme, deliberately skipped this pass.
5. Optional: frontend unit tests around the hooks layer.

Nothing is blocked. All plan gates that were defined are now met or explicitly skipped
with an ADR.

**Gotcha, cost time once:** never run `npm run build` while `next dev` is running. They
share `frontend/.next`, and the build leaves the dev server serving 500s with
`__webpack_modules__[moduleId] is not a function`. Stop dev, build, then restart dev —
or the gates fail for a reason that has nothing to do with the code.

Both servers were left running on :8000 and :3000.

## Push protocol

`main` only ever receives commits that boot. Anything mid-change goes to a `wip/<topic>` branch
instead, so the public repo's default branch stays green. Update this file in the same commit as
the work it describes. Conventional commit messages, scopes per `CLAUDE.md`.

## Open questions for the user

**One, and it is a gate-design question rather than a bug.**

**`npm run verify` reports 18/18, and that number should not be read as success.** The
lit-pixel threshold is `r+g+b > 40`. The old ocean `#090A0C` summed to 31, so the water
was never counted; the amended ground crosses it, so:

```
canvas painted non-background pixels   877,384 of 878,400   (99.9% of the frame)
basemap Ocean paints                   878,400 lit (> 20000)
basemap Satellite paints               442,276 lit (> 100000)
basemap Bare paints                      2,316 lit (> 500)
```

`canvas painted non-background pixels` would now pass **with zero data drawn**, and the
Ocean floor that P1.5 left failing now passes for entirely the wrong reason. Both want
re-anchoring — count pixels above the basemap's own ground level, or count saturated
pixels, which only data produces. `UI_POLISH_PLAN.md` §3.5 makes changing a check a
deliberate conversation, so neither has been touched.

### Closed since — two of them were my own measurement errors

**The context cloud does NOT cost ~16 ms/frame.** P1.5 recorded 59.2 → 30.2 fps and
listed it as blocking. Measured back-to-back on an idle machine the delta is **0.2 ms**
(16.7 ms context-off vs 16.9 ms context-on, both MET). The P1.5 A/B drifted mid-session.

**P3's motion work costs nothing either**, which P3 already concluded but could not prove
in absolute terms — it measured 30.0 fps for every configuration including a stashed
baseline. The same code now measures **59.9 fps**. Both errors are the trap ADR 0003
exists to prevent, and both were caused by the machine, not the code.
