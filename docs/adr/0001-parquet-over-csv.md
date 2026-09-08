# ADR 0001 - The v0 provider reads Parquet, not CSV

**Status:** accepted · 2026-09-09
**Supersedes:** the `csv_provider` named in `IMPLEMENTATION_PLAN.md` P3

## Context

The plan specified a CSV provider as the v0 default, with sample fixtures committed so
the repo clones and runs offline. On measuring the real equatorial Pacific fixture
(12 floats, 1,038,872 measurements) the two encodings are not comparable:

| Format | Size |
|---|---|
| CSV | 159 MB |
| Parquet (zstd-9) | 5.9 MB |

A 159 MB fixture cannot be committed to a public repository, and dropping enough rows
to make CSV viable would cost either the float count or the depth resolution that the
profile panel depends on.

## Decision

The v0 provider is `parquet`. `DATA_PROVIDER=parquet` is the default.

A small hand-written CSV remains useful for unit tests where a readable fixture matters
more than volume, but it is not the demo path and is not what the API serves.

## Consequences

- The committed fixture is 5.9 MB and the repo clones and runs offline, which was the
  actual requirement the plan was expressing.
- Parquet gives typed columns for free, so the provider does not re-parse strings on
  every load and startup stays fast.
- Nothing else changes. The provider sits behind the same `DataProvider` interface and
  passes the same contract suite, which is precisely what that abstraction was for -
  the swap cost one file and one config value, and no consumer was edited.
- A future `duckdb` or `postgis` provider can read the same Parquet with predicate
  pushdown and declare stronger capabilities without touching the API.
