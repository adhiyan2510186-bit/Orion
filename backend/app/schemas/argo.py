"""GENERATED FILE - DO NOT EDIT.
Source of truth: contracts/*.schema.json
Regenerate with `make contracts`. CI fails if this file differs from a fresh run.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = "1.0.0"


class QCFlag(str, Enum):
    """
    Normalized ARGO quality-control flag. Mirrors the GDAC 1-9 scale: 1 good, 2 probably
    good, 3 probably bad, 4 bad, 5 changed, 8 estimated, 9 missing.
    """

    GOOD = "good"
    PROBABLY_GOOD = "probably_good"
    PROBABLY_BAD = "probably_bad"
    BAD = "bad"
    CHANGED = "changed"
    ESTIMATED = "estimated"
    MISSING = "missing"
    UNKNOWN = "unknown"


class AnomalySeverity(str, Enum):
    """
    How loudly a detected anomaly should be surfaced.
    """

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DataMode(str, Enum):
    """
    ARGO processing mode. 'real_time' is uncalibrated; 'adjusted' and 'delayed' carry
    scientifically validated values and are preferred when present.
    """

    REAL_TIME = "real_time"
    ADJUSTED = "adjusted"
    DELAYED = "delayed"
    UNKNOWN = "unknown"


class AnomalyTag(BaseModel):
    """
    A flagged condition on a measurement or profile. Always carries machine-readable
    evidence so the UI can explain WHY without knowing anything about the detector.
    """

    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Stable machine identifier, e.g. SURFACE_HEATWAVE.")
    severity: AnomalySeverity = Field(...)
    label: str = Field(..., description="Short human-readable name for display.")
    detected_by: str = Field(..., description="Registry id of the detector that produced this tag.")
    evidence: dict[str, float] = Field(..., description="Numeric facts supporting the flag, e.g. {\"observed\": 29.41, \"threshold\": 29.0}. Rendered generically by the UI.")


class ArgoFloatPoint(BaseModel):
    """
    The atomic 4D measurement: one variable set, at one depth, at one time, from one float.
    The type the entire system revolves around.
    """

    model_config = ConfigDict(extra="forbid")

    point_id: str = Field(..., description="Stable synthetic id, formatted {wmo_id}:{cycle_number}:{level_index}.")
    wmo_id: str = Field(..., description="WMO float identifier. A STRING, not an integer - leading zeros are significant.")
    cycle_number: int = Field(..., description="Profile cycle index. Sourced from a float64 in NetCDF; cast explicitly.")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180, description="Normalized to [-180, 180] by the provider. Note that equatorial Pacific floats cross the antimeridian.")
    depth_m: float = Field(..., ge=0, description="Metres below surface, POSITIVE DOWNWARD. Derived from pressure in the provider.")
    pressure_dbar: float | None = Field(..., description="Original ARGO measurement in decibar, retained for scientific fidelity.")
    timestamp: str = Field(..., description="ISO-8601 UTC with a Z suffix. Always.")
    temperature_c: float | None = Field(..., description="Sea water temperature, degrees Celsius. null when missing - never -999 or NaN.")
    salinity_psu: float | None = Field(..., description="Practical salinity. null when missing.")
    qc_flag: QCFlag = Field(...)
    anomaly_tags: list[AnomalyTag] = Field(..., description="Empty array when nothing is flagged. Never null.")
    extras: dict[str, float | None] = Field(..., description="EXTENSION SLOT. Biogeochemical and non-core variables (oxygen, chlorophyll, nitrate, pH) land here with NO schema change. The UI renders controls for them from the matching VariableDescriptor in /meta.")


class ProfileLevel(BaseModel):
    """
    One depth bin within a single cast.
    """

    model_config = ConfigDict(extra="forbid")

    depth_m: float = Field(..., ge=0)
    pressure_dbar: float | None = Field(...)
    temperature_c: float | None = Field(...)
    salinity_psu: float | None = Field(...)
    qc_flag: QCFlag = Field(...)
    extras: dict[str, float | None] = Field(...)


class ProfileDerived(BaseModel):
    """
    Diagnostics computed from a cast. Every field is nullable because a shallow or sparse
    cast may not support the calculation, and a fabricated value is worse than a null.
    """

    model_config = ConfigDict(extra="forbid")

    thermocline_depth_m: float | None = Field(..., description="Depth of maximum negative temperature gradient.")
    halocline_depth_m: float | None = Field(..., description="Depth of maximum salinity gradient.")
    mixed_layer_depth_m: float | None = Field(..., description="Depth at which temperature departs from the near-surface reference by a fixed threshold.")
    max_temperature_gradient_c_per_m: float | None = Field(...)
    surface_temperature_c: float | None = Field(..., description="Shallowest valid temperature in the cast.")
    method: str = Field(..., description="Names the algorithm used, so a future change is visible in the data rather than silent.")


class DepthProfile(BaseModel):
    """
    A single cast: measurements against depth for one float at one cycle.
    """

    model_config = ConfigDict(extra="forbid")

    wmo_id: str = Field(...)
    cycle_number: int = Field(...)
    timestamp: str = Field(...)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    data_mode: DataMode = Field(...)
    levels: list[ProfileLevel] = Field(..., description="Depth-ordered ASCENDING (shallowest first).")
    derived: ProfileDerived = Field(...)
    anomaly_tags: list[AnomalyTag] = Field(...)


class TrajectoryPoint(BaseModel):
    """
    One surface fix on a float's path. Deliberately lighter than ArgoFloatPoint - a
    trajectory carries thousands of these.
    """

    model_config = ConfigDict(extra="forbid")

    cycle_number: int = Field(...)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timestamp: str = Field(...)
    surface_temperature_c: float | None = Field(...)


class GeoBBox(BaseModel):
    """
    Geographic bounding box. When min_lon > max_lon the box WRAPS the antimeridian and must
    be evaluated as two OR-ed spans. This is a real case in the equatorial Pacific, not a
    hypothetical.
    """

    model_config = ConfigDict(extra="forbid")

    min_lat: float = Field(..., ge=-90, le=90)
    max_lat: float = Field(..., ge=-90, le=90)
    min_lon: float = Field(..., ge=-180, le=180)
    max_lon: float = Field(..., ge=-180, le=180)


class TimeRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: str = Field(...)
    end: str = Field(...)


class FloatTrajectory(BaseModel):
    """
    One float's path over time, as time-ordered surface positions.
    """

    model_config = ConfigDict(extra="forbid")

    wmo_id: str = Field(...)
    points: list[TrajectoryPoint] = Field(..., description="Time-ordered ASCENDING.")
    start_time: str = Field(...)
    end_time: str = Field(...)
    bbox: GeoBBox = Field(...)
    cycle_count: int = Field(..., ge=0)


class FloatSummary(BaseModel):
    """
    Lightweight float record for pickers and lists. Never carries measurement arrays.
    """

    model_config = ConfigDict(extra="forbid")

    wmo_id: str = Field(...)
    cycle_count: int = Field(..., ge=0)
    first_seen: str = Field(...)
    last_seen: str = Field(...)
    last_latitude: float = Field(..., ge=-90, le=90)
    last_longitude: float = Field(..., ge=-180, le=180)
    data_mode: DataMode = Field(...)


class VariableDescriptor(BaseModel):
    """
    Runtime metadata for one measurable variable. THE mechanism that lets the UI render
    controls, legends and axes for variables it was never coded against - add one here and
    the frontend adapts with no code change.
    """

    model_config = ConfigDict(extra="forbid")

    key: str = Field(..., description="Field name on ArgoFloatPoint, or a key inside its extras map.")
    display_name: str = Field(...)
    unit: str = Field(...)
    min_value: float | None = Field(...)
    max_value: float | None = Field(...)
    colormap: str = Field(..., description="Names a perceptually-uniform scientific colormap in frontend/design/scales.ts. These are DATA, not brand - never adjusted for aesthetic fit.")
    is_extra: bool = Field(..., description="True when the value lives in the extras map rather than as a first-class field.")


class FilterOp(str, Enum):
    """
    Comparison operator for a VariableFilter.
    """

    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    EQ = "eq"
    BETWEEN = "between"


class Aggregation(str, Enum):
    """
    How matched points should be collapsed before returning.
    """

    NONE = "none"
    BY_FLOAT = "by_float"
    BY_TIME_BUCKET = "by_time_bucket"
    BY_DEPTH_BIN = "by_depth_bin"


class ProviderCapability(str, Enum):
    """
    What a DataProvider can do natively. The QueryEngine reads these and applies in-process
    whatever the provider cannot. UNDER-claiming costs performance; OVER-claiming silently
    returns wrong results.
    """

    SERVER_SIDE_FILTERING = "server_side_filtering"
    AGGREGATION = "aggregation"
    VECTOR_SEARCH = "vector_search"
    STREAMING = "streaming"
    LIVE_UPDATES = "live_updates"


class DepthRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min_m: float = Field(..., ge=0)
    max_m: float = Field(..., ge=0)


class VariableFilter(BaseModel):
    """
    A threshold condition on one variable. value2 is required only for the between operator.
    """

    model_config = ConfigDict(extra="forbid")

    variable: str = Field(..., description="A VariableDescriptor key, e.g. temperature_c.")
    op: FilterOp = Field(...)
    value: float = Field(...)
    value2: float | None = Field(...)


class QuerySpec(BaseModel):
    """
    The structured intermediate representation, and the true contract boundary between the
    NLP layer and the data layer. Every parser EMITS this; every engine CONSUMES it.
    Deliberately declarative and engine-agnostic - it describes intent without implying
    pandas, SQL or any other execution strategy.
    """

    model_config = ConfigDict(extra="forbid")

    bbox: GeoBBox | None = Field(..., description="null means unconstrained. May wrap the antimeridian.")
    depth_range_m: DepthRange | None = Field(...)
    time_range: TimeRange | None = Field(...)
    variable_filters: list[VariableFilter] = Field(...)
    wmo_ids: list[str] | None = Field(...)
    anomaly_codes: list[str] | None = Field(...)
    aggregation: Aggregation = Field(...)
    limit: int = Field(..., ge=1, le=500000)


class QueryOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int | None = Field(...)
    include_profiles: bool = Field(...)
    include_trajectories: bool = Field(...)
    parser: str | None = Field(..., description="Forces a specific parser implementation. Enables A/B evaluation of a new parser against the baseline on live traffic.")


class QueryRequest(BaseModel):
    """
    additionalProperties is false so a typo in a client field is caught loudly rather than
    ignored.
    """

    model_config = ConfigDict(extra="forbid")

    query: str = Field(..., min_length=1, max_length=2000, description="The plain-English question typed by the user.")
    filters: QuerySpec | None = Field(None, description="Optional pre-built spec. When present the parser is bypassed entirely.")
    options: QueryOptions | None = Field(None)


class ParseResult(BaseModel):
    """
    What a parser returns. unresolved is first-class: a parser that silently drops half the
    query and reports high confidence is worse than one that admits the gap.
    """

    model_config = ConfigDict(extra="forbid")

    spec: QuerySpec = Field(...)
    confidence: float = Field(..., ge=0, le=1)
    rationale: str = Field(..., description="Human-readable account of how the sentence was interpreted.")
    unresolved: list[str] = Field(..., description="Phrases the parser could not map. Rendered as clarification chips.")
    parser_id: str = Field(...)


class VariableStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    variable: str = Field(...)
    count: int = Field(..., ge=0)
    min: float | None = Field(...)
    max: float | None = Field(...)
    mean: float | None = Field(...)


class QuerySummary(BaseModel):
    """
    Everything needed to describe a result set without re-scanning the points.
    """

    model_config = ConfigDict(extra="forbid")

    answer: str = Field(..., description="One or two sentences stating what was found, in plain language.")
    matched_points: int = Field(..., ge=0)
    matched_floats: int = Field(..., ge=0)
    matched_cycles: int = Field(..., ge=0)
    time_range: TimeRange | None = Field(...)
    depth_range_m: DepthRange | None = Field(...)
    bbox: GeoBBox | None = Field(...)
    variable_stats: list[VariableStats] = Field(...)


class ResponseMeta(BaseModel):
    """
    Surfacing provider and parser identity is what makes swapping either one OBSERVABLE in
    the UI and in logs rather than invisible.
    """

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(...)
    parser: str = Field(...)
    latency_ms: float = Field(..., ge=0)
    total_matched: int = Field(..., ge=0, description="Total matches BEFORE the limit was applied.")
    truncated: bool = Field(...)
    warnings: list[str] = Field(...)
    schema_version: str = Field(...)


class QueryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spec: QuerySpec = Field(...)
    parse: ParseResult = Field(...)
    points: list[ArgoFloatPoint] = Field(...)
    trajectories: list[FloatTrajectory] = Field(...)
    profiles: list[DepthProfile] = Field(...)
    summary: QuerySummary = Field(...)
    anomalies: list[AnomalyTag] = Field(...)
    meta: ResponseMeta = Field(...)


class PointPage(BaseModel):
    """
    What DataProvider.query_points returns. total_matched and truncated must be reported
    HONESTLY - the engine trusts them.
    """

    model_config = ConfigDict(extra="forbid")

    points: list[ArgoFloatPoint] = Field(...)
    total_matched: int = Field(..., ge=0)
    truncated: bool = Field(...)


class ProviderMetadata(BaseModel):
    """
    Returned by DataProvider.describe(). Feeds both the dynamic UI controls and the parser
    ParseContext, so a parser cannot invent a variable the provider lacks.
    """

    model_config = ConfigDict(extra="forbid")

    provider_id: str = Field(...)
    record_count: int = Field(..., ge=0)
    float_count: int = Field(..., ge=0)
    bbox: GeoBBox | None = Field(...)
    time_range: TimeRange | None = Field(...)
    depth_range_m: DepthRange | None = Field(...)
    variables: list[VariableDescriptor] = Field(...)
    capabilities: list[ProviderCapability] = Field(...)


class HealthStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    healthy: bool = Field(...)
    detail: str = Field(...)


class MetaResponse(BaseModel):
    """
    GET /api/v1/meta. The frontend generates its variable controls, legends and axis bounds
    from this, which is why a new backend variable appears in the UI with no frontend
    change.
    """

    model_config = ConfigDict(extra="forbid")

    provider: ProviderMetadata = Field(...)
    parser: str = Field(...)
    schema_version: str = Field(...)
    health: HealthStatus = Field(...)
    example_queries: list[str] = Field(..., description="Seed queries known to return results against the loaded dataset.")
