---
name: add-provider
description: Add or swap a FloatChat data source behind the DataProvider interface — NetCDF, Parquet/DuckDB, live ARGO GDAC, PostGIS, or a vector DB — without touching API routes or the frontend. Use when the user wants to ingest real ARGO data, replace the CSV/JSON sample loader, connect a database or live telemetry feed, or asks why a query returns no results from a data source.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# /add-provider — Swap the data source (EP-1)

Everything about *where ARGO data comes from* lives behind `DataProvider`. A new source is **one
new file plus one env var**. If you find yourself editing `api/`, `services/`, or anything under
`frontend/`, the abstraction is being bypassed — stop and reconsider.

Read `backend/app/providers/base.py` before writing anything. If it does not exist, phase P2 has
not run; say so rather than inventing a parallel interface.

## Workflow

**1. Create `backend/app/providers/<name>_provider.py`** and subclass `DataProvider`. Implement
all eight methods — no `NotImplementedError` stubs on a provider you intend to register:

| Method | Contract |
|---|---|
| `initialize()` | Load/connect once at startup. **Must be idempotent.** |
| `query_points(spec)` | Return a `PointPage`. Must honour `spec.limit` and report `total_matched` and `truncated` honestly. |
| `get_trajectory(wmo_id, time_range)` | Surface positions, time-ordered ascending. `None` if unknown float. |
| `get_profile(wmo_id, cycle)` | One cast, depth-ordered ascending. |
| `list_floats(bbox, time_range)` | Lightweight summaries for pickers — do not return full point arrays here. |
| `describe()` | `ProviderMetadata`: bounds, `VariableDescriptor[]`, record count, capabilities. |
| `health()` | Readiness probe. |
| `close()` | Release handles/connections. |

**2. Declare capabilities honestly.** This is the single most important step.

`ProviderMetadata.capabilities` advertises what you can push down: `SERVER_SIDE_FILTERING`,
`AGGREGATION`, `VECTOR_SEARCH`, `STREAMING`, `LIVE_UPDATES`. `QueryEngine` reads these and applies
in-process whatever you cannot do yourself.

**Under-claiming is safe — it just costs performance. Over-claiming silently returns wrong
results**, because the engine will skip a filter it believes you applied. A naive Pandas provider
should claim nothing and let the engine do the work; that is the design working as intended, not
a deficiency to paper over.

**3. Normalize at ingestion.** Everything downstream assumes clean data, so the provider owns:

- pressure (dbar) → `depth_m`, positive downward, keeping `pressure_dbar` alongside
- longitude wrapped to `[-180, 180]`
- ARGO QC flags mapped to the canonical `QCFlag` enum
- sentinel values (`-999`, `9999`, `NaN`) → `null`
- variable-name aliases resolved via `domain/units.py` — GDAC files disagree on casing and naming
  across DACs, and that mess must not escape the provider
- BGC and non-core variables into `extras`, each with a `VariableDescriptor` in `describe()`

**4. Register it.** Decorate with `@register_provider("<name>")` and confirm the module is imported
by `providers/__init__.py` so the decorator actually runs. A registry entry that never executes is
the most common wiring bug here.

**5. Run the shared contract suite — this is the gate.**

```
pytest backend/tests/contract -k <name> -v
```

Every provider passes the *same* suite. That is precisely what makes the swap safe. If a test
fails, fix the provider — never weaken the shared test to accommodate one source.

Verify specifically that declared capabilities actually work: if you claim
`SERVER_SIDE_FILTERING`, a bbox query must genuinely filter server-side, not return everything.

**6. Wire it up.** Set `DATA_PROVIDER=<name>` in `.env`, document it in `.env.example`, and start
the stack. Confirm `GET /api/v1/meta` reports the new provider, bounds, and variable list — the
frontend generates its variable controls from that response, so a correct `describe()` is what
makes new variables appear in the UI with no frontend work.

**7. Ship.** `make lint && make test`, then commit with scope `providers`:
`feat(providers): add netcdf provider behind DataProvider`.

## Notes

- **Large datasets:** do not load everything into memory in `initialize()`. Lazy-load, or build a
  Parquet cache on first run and gitignore it (`backend/data/cache/` is already ignored).
- **Live sources (GDAC):** wrap in the `Cache` ABC and set a sane TTL. Network failure must surface
  through `health()`, not as a 500 on every query.
- **Composition over inheritance:** `CachingProvider` wraps any provider because it *is* a
  `DataProvider`. Add cross-cutting behaviour (retry, metrics, rate limiting) the same way rather
  than editing concrete providers.
- Sample fixtures in `backend/data/samples/` stay small and committed so the repo clones and runs
  offline. Raw downloads go to `backend/data/raw/`, which is gitignored — never commit `.nc` files.
