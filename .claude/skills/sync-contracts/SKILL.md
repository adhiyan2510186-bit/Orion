---
name: sync-contracts
description: Change the FloatChat data schema safely — edit contracts/*.schema.json, regenerate the TypeScript and Pydantic types, and record the change. Use whenever a field is added, renamed, or removed from ArgoFloatPoint, QuerySpec, DepthProfile, AnomalyTag, or any wire type; when generated types look stale or out of sync between backend and frontend; or when `make contracts` reports a diff.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# /sync-contracts — Change the schema without breaking the contract

`contracts/*.schema.json` is the single source of truth for every type crossing the wire.
`frontend/types/argo.ts` and `backend/app/schemas/argo.py` are **generated from it**. Editing
either generated file by hand is the one change guaranteed to rot the API contract, because CI
regenerates and overwrites it.

If `contracts/` does not exist yet, phase P1 of `IMPLEMENTATION_PLAN.md` has not run. Say so and
offer to build it — do not improvise types elsewhere.

## Workflow

**1. Decide whether this is additive or breaking.**

| Change | Kind | Consequence |
|---|---|---|
| Add an optional field | Additive | Safe. Minor version bump. |
| Add a value to an enum | Additive-ish | Safe only if consumers have a default branch. Check them. |
| Add a scientific variable | **Not a schema change at all** | Use `extras` + a `VariableDescriptor`. Stop here and read the note below. |
| Add a required field | Breaking | Major bump. Every provider must populate it. |
| Rename or remove a field | Breaking | Major bump. Grep every consumer first. |
| Change a type or unit | Breaking | Major bump. Highest-risk change in this codebase. |

**Before adding a variable field, stop.** Oxygen, chlorophyll, nitrate, pH and friends belong in
`ArgoFloatPoint.extras` with a matching `VariableDescriptor` from the provider's `describe()`.
That path needs *no schema change and no frontend change* — the UI generates controls from
descriptors. Only widen the schema for genuinely structural additions.

**2. Edit the JSON Schema.** Honour the frozen wire conventions:

- `snake_case` field names, both languages, no translation layer
- ISO-8601 UTC with `Z` for timestamps
- longitude `[-180, 180]`, latitude `[-90, 90]`, `depth_m` positive downward
- `null` for missing — never `-999`, `NaN`, or `9999`
- arrays default to `[]`, never `null`
- every envelope carries `schema_version`

**3. Regenerate and verify idempotence.**

```
make contracts
make contracts        # second run must produce zero diff
git diff --stat
```

A non-empty diff on the second run means the generator is unstable — fix the generator, not the
output.

**4. Find every consumer of a changed field.**

```
grep -rn "<field_name>" backend/app frontend --include=*.py --include=*.ts --include=*.tsx
```

Providers that must now populate the field, parsers that must now emit it, components reading it.
For a breaking change, every registered provider needs updating — that is the cost, and it is the
reason to prefer `extras`.

**5. Update the contract test suite.** `backend/tests/contract/` is the gate every provider and
parser passes. A new required field means a new assertion there.

**6. Record it.** Append to `contracts/CHANGELOG.md`: version, date, kind (additive/breaking),
the field, and the migration note for anyone on an older client.

**7. Verify, then ship.**

```
make lint && make test
```

Green means commit with scope `contracts`, e.g. `chore(contracts): add extras bag to point schema`
or `feat(contracts): add mixed layer depth to ProfileDerived`. Then push per CLAUDE.md.

## Failure modes to watch for

- **Editing the generated file** because it was faster. It will be overwritten and CI will fail.
- **Silent unit drift** — a field named `depth` that is sometimes dbar and sometimes metres. Keep
  units in the name (`depth_m`, `pressure_dbar`, `temperature_c`, `salinity_psu`).
- **Adding a field only one provider can populate.** Either make it optional, or accept that every
  provider must return it. Do not let `csv` return a fake value to satisfy the schema.
