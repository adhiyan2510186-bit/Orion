# Contract changelog

Every change to a wire type is recorded here with a version bump. Consumers read
`schema_version` off the response envelope.

Versioning: **major** = breaking (field removed, renamed, retyped, or made required),
**minor** = additive (new optional field, new enum member), **patch** = documentation only.

## 1.0.0 - 2026-09-09

Initial frozen contract. 31 definitions across two files.

**Domain** - `QCFlag`, `AnomalySeverity`, `DataMode`, `AnomalyTag`, `ArgoFloatPoint`,
`ProfileLevel`, `ProfileDerived`, `DepthProfile`, `TrajectoryPoint`, `GeoBBox`,
`TimeRange`, `FloatTrajectory`, `FloatSummary`, `VariableDescriptor`.

**Envelope** - `FilterOp`, `Aggregation`, `ProviderCapability`, `DepthRange`,
`VariableFilter`, `QuerySpec`, `QueryOptions`, `QueryRequest`, `ParseResult`,
`VariableStats`, `QuerySummary`, `ResponseMeta`, `QueryResponse`, `PointPage`,
`ProviderMetadata`, `HealthStatus`, `MetaResponse`.

Decisions worth remembering:

- `ArgoFloatPoint.extras` is an open map so biogeochemical variables can be ingested
  without a schema change. Paired with `VariableDescriptor`, it is what lets a new
  variable reach the UI with no frontend work.
- `GeoBBox` documents antimeridian wrapping (`min_lon > max_lon`) as a supported case.
  The sample floats genuinely cross 180 degrees, so this is not hypothetical.
- `ResponseMeta` reports `provider` and `parser` identity, which is what makes swapping
  either implementation observable rather than invisible.
- `ParseResult.unresolved` is required, not optional, so a parser must state what it
  failed to understand instead of silently dropping it.
