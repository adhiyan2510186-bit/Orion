"""The seam between the parser family and the provider family.

This is intentionally the only module that knows about both. Because each side is an
interface, the engine does not change when either is swapped - which is the load-bearing
design decision of the backend.

Its other job is capability compensation: it reads what the provider claims it can do
and applies in-process whatever is missing, so a naive provider and a database-backed
one can both sit behind the same contract without either faking anything.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from app.providers.base import DataProvider
from app.schemas.argo import (
    AnomalyTag,
    ArgoFloatPoint,
    DepthRange,
    FilterOp,
    GeoBBox,
    PointPage,
    ProviderCapability,
    QuerySpec,
    QuerySummary,
    TimeRange,
    VariableStats,
)
from app.services.anomaly import AnomalyDetector


@dataclass
class ExecutionResult:
    points: list[ArgoFloatPoint]
    summary: QuerySummary
    anomalies: list[AnomalyTag]
    total_matched: int
    truncated: bool
    latency_ms: float
    warnings: list[str]


class QueryEngine:
    def __init__(self, provider: DataProvider, detectors: list[AnomalyDetector]) -> None:
        self._provider = provider
        self._detectors = detectors

    async def execute(self, spec: QuerySpec) -> ExecutionResult:
        started = time.perf_counter()
        warnings: list[str] = []

        capabilities = set(self._provider.describe().capabilities)
        pushdown, residual = self._split(spec, capabilities, warnings)

        page: PointPage = await self._provider.query_points(pushdown)
        points = page.points
        total = page.total_matched
        truncated = page.truncated

        if residual is not None:
            before = len(points)
            points = self._apply_residual(points, residual)
            # The provider could not narrow this itself, so its total is an upper bound.
            # Reporting it unqualified would overstate the result set.
            total = len(points) if not truncated else total
            if before != len(points):
                warnings.append(
                    f"Applied {len(residual)} filter(s) in-process; "
                    f"{self._provider.provider_id} does not support server-side filtering."
                )

        points = self._tag_anomalies(points)
        anomalies = self._collect_anomalies(points, spec)

        if spec.anomaly_codes:
            wanted = set(spec.anomaly_codes)
            if "*" in wanted:
                points = [p for p in points if p.anomaly_tags]
            else:
                points = [p for p in points if any(t.code in wanted for t in p.anomaly_tags)]
            total = len(points)

        # Statistics must describe the whole match, not the page we happened to return.
        # Anomaly filtering happens here rather than in the provider, so when it is in
        # play only the in-memory points reflect the true result set.
        summary = None
        if not spec.anomaly_codes:
            summary = await self._provider.summarize(spec)
        if summary is None:
            summary = self._summarise(points, total)
            if truncated and not spec.anomaly_codes:
                warnings.append(
                    "Summary statistics were computed from the returned sample because "
                    f"{self._provider.provider_id} cannot aggregate; counts other than "
                    "matched_points describe the sample only."
                )

        return ExecutionResult(
            points=points,
            summary=summary,
            anomalies=anomalies,
            total_matched=total,
            truncated=truncated,
            latency_ms=round((time.perf_counter() - started) * 1000, 2),
            warnings=warnings,
        )

    # ----------------------------------------------------------- capabilities
    @staticmethod
    def _split(
        spec: QuerySpec, capabilities: set[ProviderCapability], warnings: list[str]
    ) -> tuple[QuerySpec, list | None]:
        """Divide the spec into what the provider can do and what we must do here."""
        if ProviderCapability.SERVER_SIDE_FILTERING in capabilities:
            return spec, None

        # The provider cannot filter, so ask it for everything within the limit and
        # narrow locally. Requesting the raw limit would truncate before filtering and
        # silently lose matches.
        pushdown = spec.model_copy(
            update={
                "variable_filters": [],
                "bbox": None,
                "depth_range_m": None,
                "time_range": None,
                "limit": min(spec.limit * 10, 500_000),
            }
        )
        warnings.append("Provider lacks server-side filtering; the engine is compensating.")
        return pushdown, [spec]

    @staticmethod
    def _apply_residual(points: list[ArgoFloatPoint], residual: list) -> list[ArgoFloatPoint]:
        spec: QuerySpec = residual[0]
        out = points
        if spec.bbox is not None:
            out = [p for p in out if _in_bbox(p, spec.bbox)]
        if spec.depth_range_m is not None:
            out = [p for p in out if _in_depth(p, spec.depth_range_m)]
        if spec.time_range is not None:
            out = [p for p in out if _in_time(p, spec.time_range)]
        if spec.wmo_ids:
            wanted = set(spec.wmo_ids)
            out = [p for p in out if p.wmo_id in wanted]
        for filt in spec.variable_filters:
            out = [p for p in out if _passes(p, filt)]
        return out[: spec.limit]

    # --------------------------------------------------------------- anomalies
    def _tag_anomalies(self, points: list[ArgoFloatPoint]) -> list[ArgoFloatPoint]:
        if not self._detectors:
            return points
        for point in points:
            tags = [tag for d in self._detectors if (tag := d.detect(point)) is not None]
            if tags:
                point.anomaly_tags = tags
        return points

    @staticmethod
    def _collect_anomalies(points: list[ArgoFloatPoint], spec: QuerySpec) -> list[AnomalyTag]:
        """One representative tag per code, carrying the most extreme evidence seen."""
        best: dict[str, AnomalyTag] = {}
        for point in points:
            for tag in point.anomaly_tags:
                current = best.get(tag.code)
                if current is None or _severity_rank(tag) > _severity_rank(current):
                    best[tag.code] = tag
        return [best[code] for code in sorted(best)]

    # ---------------------------------------------------------------- summary
    @staticmethod
    def _summarise(points: list[ArgoFloatPoint], total: int) -> QuerySummary:
        if not points:
            return QuerySummary(
                answer="No measurements matched those constraints.",
                matched_points=0,
                matched_floats=0,
                matched_cycles=0,
                time_range=None,
                depth_range_m=None,
                bbox=None,
                variable_stats=[],
            )

        floats = {p.wmo_id for p in points}
        cycles = {(p.wmo_id, p.cycle_number) for p in points}
        times = sorted(p.timestamp for p in points)
        depths = [p.depth_m for p in points]
        lats = [p.latitude for p in points]
        lons = [p.longitude for p in points]

        stats: list[VariableStats] = []
        for key in ("temperature_c", "salinity_psu"):
            values = [v for p in points if (v := getattr(p, key)) is not None]
            stats.append(
                VariableStats(
                    variable=key,
                    count=len(values),
                    min=round(min(values), 3) if values else None,
                    max=round(max(values), 3) if values else None,
                    mean=round(sum(values) / len(values), 3) if values else None,
                )
            )

        flagged = sum(1 for p in points if p.anomaly_tags)
        answer = (
            f"{total:,} measurements from {len(floats)} float"
            f"{'s' if len(floats) != 1 else ''} across {len(cycles):,} profiles, "
            f"{times[0][:10]} to {times[-1][:10]}."
        )
        if flagged:
            answer += f" {flagged:,} are flagged as anomalous."

        return QuerySummary(
            answer=answer,
            matched_points=total,
            matched_floats=len(floats),
            matched_cycles=len(cycles),
            time_range=TimeRange(start=times[0], end=times[-1]),
            depth_range_m=DepthRange(min_m=round(min(depths), 2), max_m=round(max(depths), 2)),
            bbox=GeoBBox(
                min_lat=round(min(lats), 4),
                max_lat=round(max(lats), 4),
                min_lon=round(min(lons), 4),
                max_lon=round(max(lons), 4),
            ),
            variable_stats=stats,
        )


# --------------------------------------------------------------------------- #
# Residual predicates
# --------------------------------------------------------------------------- #

_SEVERITY_ORDER = {"info": 0, "warning": 1, "critical": 2}


def _severity_rank(tag: AnomalyTag) -> int:
    return _SEVERITY_ORDER.get(str(tag.severity.value), 0)


def _in_bbox(point: ArgoFloatPoint, box: GeoBBox) -> bool:
    if not (box.min_lat <= point.latitude <= box.max_lat):
        return False
    if box.min_lon <= box.max_lon:
        return box.min_lon <= point.longitude <= box.max_lon
    # Wrapped across the antimeridian.
    return point.longitude >= box.min_lon or point.longitude <= box.max_lon


def _in_depth(point: ArgoFloatPoint, span: DepthRange) -> bool:
    return span.min_m <= point.depth_m <= span.max_m


def _in_time(point: ArgoFloatPoint, span: TimeRange) -> bool:
    return span.start <= point.timestamp <= span.end


def _passes(point: ArgoFloatPoint, filt) -> bool:
    value = getattr(point, filt.variable, None)
    if value is None:
        return False
    match filt.op:
        case FilterOp.GT:
            return value > filt.value
        case FilterOp.GTE:
            return value >= filt.value
        case FilterOp.LT:
            return value < filt.value
        case FilterOp.LTE:
            return value <= filt.value
        case FilterOp.EQ:
            return abs(value - filt.value) < 1e-9
        case FilterOp.BETWEEN:
            high = filt.value2 if filt.value2 is not None else filt.value
            low, high = sorted((filt.value, high))
            return low <= value <= high
    return True
