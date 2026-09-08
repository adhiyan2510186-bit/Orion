# Extension Guide

How to change each part of FloatChat without refactoring the rest. Every recipe here
has been exercised at least once during the build, so the file counts are measured
rather than aspirational.

---

## EP-1 — Swap the data source

**Cost: one new file plus one env var. Measured.** The NetCDF provider was added this
way; `netcdf_provider.py` is 40 lines and contains no query logic at all.

1. Create `backend/app/providers/<name>_provider.py`, subclassing either:
   - **`FrameBackedProvider`** if your source loads into a pandas frame — supply only
     `default_path()` and `_load_frame()`, and inherit every filter, aggregate and
     diagnostic already verified by the contract suite.
   - **`DataProvider`** directly if you are pushing work to a database and need to
     implement `query_points`, `summarize` and friends yourself.
2. **Declare capabilities honestly** in `describe()`. Under-claiming costs performance
   and the engine compensates. **Over-claiming silently returns wrong results**, because
   the engine skips a filter it believes you already applied. There is a contract test
   for exactly this.
3. Decorate with `@register_provider("<name>")` and add the import to
   `app/providers/__init__.py` — a decorator that never runs is invisible to the
   registry, and it is the most common wiring bug in this design.
4. Add `"<name>"` to `PROVIDERS` in `tests/contract/test_provider_contract.py` and run
   `pytest backend/tests/contract -q`. **Change nothing else in that file.** If a test
   fails, fix the provider; never weaken a shared test to accommodate one source.
5. Set `DATA_PROVIDER=<name>`.

Nothing in `api/`, `services/` or `frontend/` is touched.

## EP-2 — Swap the NL parser

1. Create `backend/app/parsers/<name>_parser.py`, subclass `NLPParser`, implement
   `parse(query, context) -> ParseResult`.
2. **Use `ParseContext`.** It carries the loaded provider's real variables and bounds.
   This is what stops an LLM inventing a variable the data lacks, and there is a
   contract test asserting it.
3. **Populate `unresolved` honestly.** A parser that drops half the query and reports
   high confidence is worse than one that admits the gap — the user gets a confident
   wrong answer instead of a question.
4. For an LLM, pass `QuerySpec`'s JSON Schema as the tool definition rather than asking
   for free-form JSON. The output is then structurally valid by construction.
5. `@register_parser("<name>")`, import in `app/parsers/__init__.py`, set `NLP_PARSER`.
6. Add to `PARSERS` in `tests/contract/test_parser_contract.py` and pass **the same
   golden set** the rule parser passes. That comparison is the only honest way to tell
   whether a new parser is actually better.

**Keep `rule` available.** It has no network dependency and no cost, so it is what
answers when a vendor is slow or down. `QueryRequest.options.parser` forces a specific
implementation, which lets you A/B a new parser against the baseline on live traffic;
`QueryResponse.meta.parser` reports which one actually answered.

## EP-3 — Add a visualization

**Cost: one new file.** `MapCanvas`, the hooks and the stores are never edited.

1. Create `frontend/features/map/layers/<name>Layer.ts` exporting a `LayerFactory`:
   `{ id, label, supports(meta), build(ctx) }`.
2. Everything you need arrives in `LayerContext` — points, trajectories, time cursor,
   colour scale, selection, exaggeration. A layer that reaches outside it has broken the
   abstraction and will break again when the transport changes.
3. Gate on data with `supports(meta)` so a layer for a variable this dataset lacks
   disappears cleanly rather than rendering empty.
4. Register it in `features/map/layers/index.ts`. `useLayerBuilder` picks it up
   automatically.
5. Keep `updateTriggers` precise. An over-broad list forces a full attribute re-upload
   every frame during playback and is the usual cause of scrubbing jank.

**Custom shaders** go in `features/map/shaders/<effect>.glsl.ts`, consumed via deck.gl's
`getShaders()`. No component imports shader source, which is what lets a future team
replace point sprites with volumetric rendering without touching the UI tree.

**Replacing deck.gl entirely** is a sibling `MapCanvas.<backend>.tsx` taking the same
deck-agnostic `LayerContext`. Hooks and state are unaffected.

## EP-4 — Re-theme

Edit `frontend/design/tokens.ts`. **Zero component files change.**

Tailwind reads the CSS variables in `app/globals.css`; deck.gl reads the numeric `rgb`
export from the same module. Both forms live in one file precisely so they cannot drift
— a hardcoded `[218, 85, 161]` in a layer is what would break this guarantee.

Scientific colormaps in `design/scales.ts` are **not** part of the theme. They are data,
chosen for perceptual uniformity, and adjusting them to match a palette would make the
map lie about magnitude.

## EP-5 — Add a scientific variable (oxygen, chlorophyll, pH)

**No schema change and no frontend change.**

1. Have the provider populate `ArgoFloatPoint.extras["oxygen_umol_kg"]`.
2. Add a matching `VariableDescriptor` to `describe()`, naming a colormap.
3. Done. `useMeta()` surfaces it; the variable picker, colour legend and axis bounds are
   all generated from descriptors.

This is what the `extras` bag and `VariableDescriptor` exist for. Resist widening the
schema for a variable — only structural additions justify a version bump.

## EP-6 — Add an anomaly detector

Subclass `AnomalyDetector` in `app/services/anomaly.py`, `@register_detector("<code>")`,
add the name to `ANOMALY_DETECTORS` in `.env`.

Emit machine-readable `evidence`, and make thresholds constructor arguments. A flag a
scientist cannot audit is a flag they will not trust, and a hard-coded threshold is
wrong everywhere except the basin it was tuned for.

## EP-7 — Scale out

The seams are cut already:

- **Out-of-memory data** — a `duckdb` provider reading the same Parquet with predicate
  pushdown, declaring `SERVER_SIDE_FILTERING`; the engine stops compensating.
- **Live float updates** — a WebSocket `Transport` in `lib/api/transport.ts`. No
  component changes, because no component knows how data arrives.
- **Caching** — wrap any provider; a decorator that implements `DataProvider` composes
  without the wrapped provider knowing.

## EP-8 — Change a wire type

See `contracts/README.md`. In short: edit the JSON Schema, run `.\make.ps1 contracts`
**twice** (the second run must report `unchanged`), update `contracts/CHANGELOG.md`, and
never hand-edit a generated file — CI regenerates and overwrites it.

`/api/v1` is namespaced from day one, so a v2 can be added alongside while v1 keeps
serving.

---

## Checklist for a hand-off

- [ ] `.\make.ps1 contracts-check` passes
- [ ] `.\make.ps1 test` green for **every** registered provider and parser
- [ ] `.\make.ps1 lint` clean
- [ ] `cd frontend && npx tsc --noEmit` clean
- [ ] New pluggable things are in the config-driven registries, not in a conditional
- [ ] `PROGRESS.md` reflects reality, including anything left unfinished
