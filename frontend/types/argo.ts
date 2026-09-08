/* eslint-disable */
// GENERATED FILE - DO NOT EDIT.
// Source of truth: contracts/*.schema.json
// Regenerate with `make contracts`. CI fails if this file differs from a fresh run.

export const SCHEMA_VERSION = "1.0.0" as const;

/**
 * Normalized ARGO quality-control flag. Mirrors the GDAC 1-9 scale: 1 good, 2 probably good, 3
 * probably bad, 4 bad, 5 changed, 8 estimated, 9 missing.
 */
export type QCFlag = "good" | "probably_good" | "probably_bad" | "bad" | "changed" | "estimated" | "missing" | "unknown";
export const QC_FLAG_VALUES: readonly QCFlag[] = ["good", "probably_good", "probably_bad", "bad", "changed", "estimated", "missing", "unknown"] as const;

/** How loudly a detected anomaly should be surfaced. */
export type AnomalySeverity = "info" | "warning" | "critical";
export const ANOMALY_SEVERITY_VALUES: readonly AnomalySeverity[] = ["info", "warning", "critical"] as const;

/**
 * ARGO processing mode. 'real_time' is uncalibrated; 'adjusted' and 'delayed' carry
 * scientifically validated values and are preferred when present.
 */
export type DataMode = "real_time" | "adjusted" | "delayed" | "unknown";
export const DATA_MODE_VALUES: readonly DataMode[] = ["real_time", "adjusted", "delayed", "unknown"] as const;

/**
 * A flagged condition on a measurement or profile. Always carries machine-readable evidence so
 * the UI can explain WHY without knowing anything about the detector.
 */
export interface AnomalyTag {
  /** Stable machine identifier, e.g. SURFACE_HEATWAVE. */
  code: string;
  severity: AnomalySeverity;
  /** Short human-readable name for display. */
  label: string;
  /** Registry id of the detector that produced this tag. */
  detected_by: string;
  /**
   * Numeric facts supporting the flag, e.g. {"observed": 29.41, "threshold": 29.0}. Rendered
   * generically by the UI.
   */
  evidence: Record<string, number>;
}

/**
 * The atomic 4D measurement: one variable set, at one depth, at one time, from one float. The
 * type the entire system revolves around.
 */
export interface ArgoFloatPoint {
  /** Stable synthetic id, formatted {wmo_id}:{cycle_number}:{level_index}. */
  point_id: string;
  /** WMO float identifier. A STRING, not an integer - leading zeros are significant. */
  wmo_id: string;
  /** Profile cycle index. Sourced from a float64 in NetCDF; cast explicitly. */
  cycle_number: number;
  latitude: number;
  /**
   * Normalized to [-180, 180] by the provider. Note that equatorial Pacific floats cross the
   * antimeridian.
   */
  longitude: number;
  /** Metres below surface, POSITIVE DOWNWARD. Derived from pressure in the provider. */
  depth_m: number;
  /** Original ARGO measurement in decibar, retained for scientific fidelity. */
  pressure_dbar: number | null;
  /** ISO-8601 UTC with a Z suffix. Always. */
  timestamp: string;
  /** Sea water temperature, degrees Celsius. null when missing - never -999 or NaN. */
  temperature_c: number | null;
  /** Practical salinity. null when missing. */
  salinity_psu: number | null;
  qc_flag: QCFlag;
  /** Empty array when nothing is flagged. Never null. */
  anomaly_tags: AnomalyTag[];
  /**
   * EXTENSION SLOT. Biogeochemical and non-core variables (oxygen, chlorophyll, nitrate, pH)
   * land here with NO schema change. The UI renders controls for them from the matching
   * VariableDescriptor in /meta.
   */
  extras: Record<string, number | null>;
}

/** One depth bin within a single cast. */
export interface ProfileLevel {
  depth_m: number;
  pressure_dbar: number | null;
  temperature_c: number | null;
  salinity_psu: number | null;
  qc_flag: QCFlag;
  extras: Record<string, number | null>;
}

/**
 * Diagnostics computed from a cast. Every field is nullable because a shallow or sparse cast
 * may not support the calculation, and a fabricated value is worse than a null.
 */
export interface ProfileDerived {
  /** Depth of maximum negative temperature gradient. */
  thermocline_depth_m: number | null;
  /** Depth of maximum salinity gradient. */
  halocline_depth_m: number | null;
  /** Depth at which temperature departs from the near-surface reference by a fixed threshold. */
  mixed_layer_depth_m: number | null;
  max_temperature_gradient_c_per_m: number | null;
  /** Shallowest valid temperature in the cast. */
  surface_temperature_c: number | null;
  /** Names the algorithm used, so a future change is visible in the data rather than silent. */
  method: string;
}

/** A single cast: measurements against depth for one float at one cycle. */
export interface DepthProfile {
  wmo_id: string;
  cycle_number: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  data_mode: DataMode;
  /** Depth-ordered ASCENDING (shallowest first). */
  levels: ProfileLevel[];
  derived: ProfileDerived;
  anomaly_tags: AnomalyTag[];
}

/**
 * One surface fix on a float's path. Deliberately lighter than ArgoFloatPoint - a trajectory
 * carries thousands of these.
 */
export interface TrajectoryPoint {
  cycle_number: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  surface_temperature_c: number | null;
}

/**
 * Geographic bounding box. When min_lon > max_lon the box WRAPS the antimeridian and must be
 * evaluated as two OR-ed spans. This is a real case in the equatorial Pacific, not a
 * hypothetical.
 */
export interface GeoBBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

/** One float's path over time, as time-ordered surface positions. */
export interface FloatTrajectory {
  wmo_id: string;
  /** Time-ordered ASCENDING. */
  points: TrajectoryPoint[];
  start_time: string;
  end_time: string;
  bbox: GeoBBox;
  cycle_count: number;
}

/** Lightweight float record for pickers and lists. Never carries measurement arrays. */
export interface FloatSummary {
  wmo_id: string;
  cycle_count: number;
  first_seen: string;
  last_seen: string;
  last_latitude: number;
  last_longitude: number;
  data_mode: DataMode;
}

/**
 * Runtime metadata for one measurable variable. THE mechanism that lets the UI render
 * controls, legends and axes for variables it was never coded against - add one here and the
 * frontend adapts with no code change.
 */
export interface VariableDescriptor {
  /** Field name on ArgoFloatPoint, or a key inside its extras map. */
  key: string;
  display_name: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  /**
   * Names a perceptually-uniform scientific colormap in frontend/design/scales.ts. These are
   * DATA, not brand - never adjusted for aesthetic fit.
   */
  colormap: string;
  /** True when the value lives in the extras map rather than as a first-class field. */
  is_extra: boolean;
}

/** Comparison operator for a VariableFilter. */
export type FilterOp = "gt" | "gte" | "lt" | "lte" | "eq" | "between";
export const FILTER_OP_VALUES: readonly FilterOp[] = ["gt", "gte", "lt", "lte", "eq", "between"] as const;

/** How matched points should be collapsed before returning. */
export type Aggregation = "none" | "by_float" | "by_time_bucket" | "by_depth_bin";
export const AGGREGATION_VALUES: readonly Aggregation[] = ["none", "by_float", "by_time_bucket", "by_depth_bin"] as const;

/**
 * What a DataProvider can do natively. The QueryEngine reads these and applies in-process
 * whatever the provider cannot. UNDER-claiming costs performance; OVER-claiming silently
 * returns wrong results.
 */
export type ProviderCapability = "server_side_filtering" | "aggregation" | "vector_search" | "streaming" | "live_updates";
export const PROVIDER_CAPABILITY_VALUES: readonly ProviderCapability[] = ["server_side_filtering", "aggregation", "vector_search", "streaming", "live_updates"] as const;

export interface DepthRange {
  min_m: number;
  max_m: number;
}

/** A threshold condition on one variable. value2 is required only for the between operator. */
export interface VariableFilter {
  /** A VariableDescriptor key, e.g. temperature_c. */
  variable: string;
  op: FilterOp;
  value: number;
  value2: number | null;
}

/**
 * The structured intermediate representation, and the true contract boundary between the NLP
 * layer and the data layer. Every parser EMITS this; every engine CONSUMES it. Deliberately
 * declarative and engine-agnostic - it describes intent without implying pandas, SQL or any
 * other execution strategy.
 */
export interface QuerySpec {
  /** null means unconstrained. May wrap the antimeridian. */
  bbox: GeoBBox | null;
  depth_range_m: DepthRange | null;
  time_range: TimeRange | null;
  variable_filters: VariableFilter[];
  wmo_ids: string[] | null;
  anomaly_codes: string[] | null;
  aggregation: Aggregation;
  limit: number;
}

export interface QueryOptions {
  limit: number | null;
  include_profiles: boolean;
  include_trajectories: boolean;
  /**
   * Forces a specific parser implementation. Enables A/B evaluation of a new parser against the
   * baseline on live traffic.
   */
  parser: string | null;
}

/**
 * additionalProperties is false so a typo in a client field is caught loudly rather than
 * ignored.
 */
export interface QueryRequest {
  /** The plain-English question typed by the user. */
  query: string;
  /** Optional pre-built spec. When present the parser is bypassed entirely. */
  filters?: QuerySpec | null;
  options?: QueryOptions | null;
}

/**
 * What a parser returns. unresolved is first-class: a parser that silently drops half the
 * query and reports high confidence is worse than one that admits the gap.
 */
export interface ParseResult {
  spec: QuerySpec;
  confidence: number;
  /** Human-readable account of how the sentence was interpreted. */
  rationale: string;
  /** Phrases the parser could not map. Rendered as clarification chips. */
  unresolved: string[];
  parser_id: string;
}

export interface VariableStats {
  variable: string;
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
}

/** Everything needed to describe a result set without re-scanning the points. */
export interface QuerySummary {
  /** One or two sentences stating what was found, in plain language. */
  answer: string;
  matched_points: number;
  matched_floats: number;
  matched_cycles: number;
  time_range: TimeRange | null;
  depth_range_m: DepthRange | null;
  bbox: GeoBBox | null;
  variable_stats: VariableStats[];
}

/**
 * Surfacing provider and parser identity is what makes swapping either one OBSERVABLE in the
 * UI and in logs rather than invisible.
 */
export interface ResponseMeta {
  provider: string;
  parser: string;
  latency_ms: number;
  /** Total matches BEFORE the limit was applied. */
  total_matched: number;
  truncated: boolean;
  warnings: string[];
  schema_version: string;
}

export interface QueryResponse {
  spec: QuerySpec;
  parse: ParseResult;
  points: ArgoFloatPoint[];
  trajectories: FloatTrajectory[];
  profiles: DepthProfile[];
  summary: QuerySummary;
  anomalies: AnomalyTag[];
  meta: ResponseMeta;
}

/**
 * What DataProvider.query_points returns. total_matched and truncated must be reported
 * HONESTLY - the engine trusts them.
 */
export interface PointPage {
  points: ArgoFloatPoint[];
  total_matched: number;
  truncated: boolean;
}

/**
 * Returned by DataProvider.describe(). Feeds both the dynamic UI controls and the parser
 * ParseContext, so a parser cannot invent a variable the provider lacks.
 */
export interface ProviderMetadata {
  provider_id: string;
  record_count: number;
  float_count: number;
  bbox: GeoBBox | null;
  time_range: TimeRange | null;
  depth_range_m: DepthRange | null;
  variables: VariableDescriptor[];
  capabilities: ProviderCapability[];
}

export interface HealthStatus {
  healthy: boolean;
  detail: string;
}

/**
 * GET /api/v1/meta. The frontend generates its variable controls, legends and axis bounds from
 * this, which is why a new backend variable appears in the UI with no frontend change.
 */
export interface MetaResponse {
  provider: ProviderMetadata;
  parser: string;
  schema_version: string;
  health: HealthStatus;
  /** Seed queries known to return results against the loaded dataset. */
  example_queries: string[];
}

// ---------------------------------------------------------------------------
// Runtime guards. Shape checks only - presence of every required field.
// Intended for development-mode validation at the transport boundary, where
// a malformed payload should fail loudly rather than surface as a blank panel.
// ---------------------------------------------------------------------------

export function isAnomalyTag(v: unknown): v is AnomalyTag {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "code" in o &&
    "detected_by" in o &&
    "evidence" in o &&
    "label" in o &&
    "severity" in o
  );
}

export function isArgoFloatPoint(v: unknown): v is ArgoFloatPoint {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "anomaly_tags" in o &&
    "cycle_number" in o &&
    "depth_m" in o &&
    "extras" in o &&
    "latitude" in o &&
    "longitude" in o &&
    "point_id" in o &&
    "pressure_dbar" in o &&
    "qc_flag" in o &&
    "salinity_psu" in o &&
    "temperature_c" in o &&
    "timestamp" in o &&
    "wmo_id" in o
  );
}

export function isProfileLevel(v: unknown): v is ProfileLevel {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "depth_m" in o &&
    "extras" in o &&
    "pressure_dbar" in o &&
    "qc_flag" in o &&
    "salinity_psu" in o &&
    "temperature_c" in o
  );
}

export function isProfileDerived(v: unknown): v is ProfileDerived {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "halocline_depth_m" in o &&
    "max_temperature_gradient_c_per_m" in o &&
    "method" in o &&
    "mixed_layer_depth_m" in o &&
    "surface_temperature_c" in o &&
    "thermocline_depth_m" in o
  );
}

export function isDepthProfile(v: unknown): v is DepthProfile {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "anomaly_tags" in o &&
    "cycle_number" in o &&
    "data_mode" in o &&
    "derived" in o &&
    "latitude" in o &&
    "levels" in o &&
    "longitude" in o &&
    "timestamp" in o &&
    "wmo_id" in o
  );
}

export function isTrajectoryPoint(v: unknown): v is TrajectoryPoint {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "cycle_number" in o &&
    "latitude" in o &&
    "longitude" in o &&
    "surface_temperature_c" in o &&
    "timestamp" in o
  );
}

export function isGeoBBox(v: unknown): v is GeoBBox {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "max_lat" in o &&
    "max_lon" in o &&
    "min_lat" in o &&
    "min_lon" in o
  );
}

export function isTimeRange(v: unknown): v is TimeRange {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "end" in o &&
    "start" in o
  );
}

export function isFloatTrajectory(v: unknown): v is FloatTrajectory {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "bbox" in o &&
    "cycle_count" in o &&
    "end_time" in o &&
    "points" in o &&
    "start_time" in o &&
    "wmo_id" in o
  );
}

export function isFloatSummary(v: unknown): v is FloatSummary {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "cycle_count" in o &&
    "data_mode" in o &&
    "first_seen" in o &&
    "last_latitude" in o &&
    "last_longitude" in o &&
    "last_seen" in o &&
    "wmo_id" in o
  );
}

export function isVariableDescriptor(v: unknown): v is VariableDescriptor {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "colormap" in o &&
    "display_name" in o &&
    "is_extra" in o &&
    "key" in o &&
    "max_value" in o &&
    "min_value" in o &&
    "unit" in o
  );
}

export function isDepthRange(v: unknown): v is DepthRange {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "max_m" in o &&
    "min_m" in o
  );
}

export function isVariableFilter(v: unknown): v is VariableFilter {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "op" in o &&
    "value" in o &&
    "value2" in o &&
    "variable" in o
  );
}

export function isQuerySpec(v: unknown): v is QuerySpec {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "aggregation" in o &&
    "anomaly_codes" in o &&
    "bbox" in o &&
    "depth_range_m" in o &&
    "limit" in o &&
    "time_range" in o &&
    "variable_filters" in o &&
    "wmo_ids" in o
  );
}

export function isQueryOptions(v: unknown): v is QueryOptions {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "include_profiles" in o &&
    "include_trajectories" in o &&
    "limit" in o &&
    "parser" in o
  );
}

export function isQueryRequest(v: unknown): v is QueryRequest {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "query" in o
  );
}

export function isParseResult(v: unknown): v is ParseResult {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "confidence" in o &&
    "parser_id" in o &&
    "rationale" in o &&
    "spec" in o &&
    "unresolved" in o
  );
}

export function isVariableStats(v: unknown): v is VariableStats {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "count" in o &&
    "max" in o &&
    "mean" in o &&
    "min" in o &&
    "variable" in o
  );
}

export function isQuerySummary(v: unknown): v is QuerySummary {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "answer" in o &&
    "bbox" in o &&
    "depth_range_m" in o &&
    "matched_cycles" in o &&
    "matched_floats" in o &&
    "matched_points" in o &&
    "time_range" in o &&
    "variable_stats" in o
  );
}

export function isResponseMeta(v: unknown): v is ResponseMeta {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "latency_ms" in o &&
    "parser" in o &&
    "provider" in o &&
    "schema_version" in o &&
    "total_matched" in o &&
    "truncated" in o &&
    "warnings" in o
  );
}

export function isQueryResponse(v: unknown): v is QueryResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "anomalies" in o &&
    "meta" in o &&
    "parse" in o &&
    "points" in o &&
    "profiles" in o &&
    "spec" in o &&
    "summary" in o &&
    "trajectories" in o
  );
}

export function isPointPage(v: unknown): v is PointPage {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "points" in o &&
    "total_matched" in o &&
    "truncated" in o
  );
}

export function isProviderMetadata(v: unknown): v is ProviderMetadata {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "bbox" in o &&
    "capabilities" in o &&
    "depth_range_m" in o &&
    "float_count" in o &&
    "provider_id" in o &&
    "record_count" in o &&
    "time_range" in o &&
    "variables" in o
  );
}

export function isHealthStatus(v: unknown): v is HealthStatus {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "detail" in o &&
    "healthy" in o
  );
}

export function isMetaResponse(v: unknown): v is MetaResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    "example_queries" in o &&
    "health" in o &&
    "parser" in o &&
    "provider" in o &&
    "schema_version" in o
  );
}
