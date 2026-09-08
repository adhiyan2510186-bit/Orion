# contracts/

**The single source of truth for every type that crosses the wire.**

```
argo.schema.json    domain entities   (ArgoFloatPoint, DepthProfile, AnomalyTag, ...)
query.schema.json   query envelope    (QuerySpec, QueryRequest, QueryResponse, ...)
        |
        +-- codegen/gen_typescript.py --> frontend/types/argo.ts
        +-- codegen/gen_pydantic.py   --> backend/app/schemas/argo.py
```

Both generated files carry a DO-NOT-EDIT banner. Editing one by hand is the single
change guaranteed to rot the API contract, because CI regenerates and overwrites it.

## Changing a type

1. Edit the JSON Schema.
2. `.\make.ps1 contracts` (or `mingw32-make contracts`).
3. Run it **again** - the second run must report `unchanged`. Generation is a pure
   function of the schema; if a second run produces a diff the generator is unstable,
   and the fix belongs in the generator, not in the output.
4. Record the change in `CHANGELOG.md` with a version bump.

Before widening the schema for a new *variable*, stop: oxygen, chlorophyll, nitrate and
pH belong in `ArgoFloatPoint.extras` with a matching `VariableDescriptor`. That path needs
no schema change and no frontend change, because the UI builds its controls from the
descriptors `/meta` reports.

## Local conventions

- **One shared `$defs` namespace.** The two files split domain from envelope for
  readability, but references are plain `#/$defs/Name` across both. A duplicate name
  is a hard error in the loader rather than a silent shadow.
- **`snake_case` on the wire, in both languages.** There is no camelCase translation
  layer, because translation layers are where contracts drift.
- **Nullable is `"type": ["number", "null"]`** for scalars, and
  `oneOf: [{$ref}, {type: null}]` for references. The generators handle exactly these
  two shapes; anything else raises rather than emitting a silently wrong type.
- **Missing means `null`** - never `-999`, `NaN` or `9999`. Sentinel scrubbing is the
  provider's job, done at ingestion.
- **Arrays default to `[]`, never null.**
- **`additionalProperties: false`** maps to Pydantic `extra="forbid"`, so a typo in an
  inbound field fails loudly instead of being ignored.

## Supported JSON Schema subset

The generators deliberately implement only what these contracts use, so that an
unsupported construct fails loudly instead of producing a plausible-but-wrong type:

`type` (scalar or nullable list) · `properties` · `required` · `additionalProperties`
(`false`, or a schema for map values) · `items` · `enum` on strings · `$ref` to
`#/$defs/` · `oneOf` in the nullable-reference shape · `minimum` / `maximum` /
`minLength` / `maxLength` (carried into Pydantic `Field`) · `description`
(carried into docstrings and JSDoc).
