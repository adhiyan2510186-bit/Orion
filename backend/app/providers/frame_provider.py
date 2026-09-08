"""Shared implementation for providers backed by an in-memory pandas frame.

Both the Parquet and NetCDF providers load the *same* normalised columns and then
answer queries identically. Writing that logic twice would guarantee the two paths
eventually disagree about what the same data means, so a subclass supplies only
`_load_frame()` and a source label - roughly thirty lines each.

Capabilities are declared honestly: filtering and aggregation happen in-process over
the whole frame, so the spec really is fully applied here and nothing is faked.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import numpy as np
import pandas as pd

from app.domain.units import ACCEPTABLE_QC, CORE_VARIABLES
from app.providers.base import DataProvider
from app.schemas.argo import (
    AnomalyTag,
    DataMode,
    DepthProfile,
    DepthRange,
    FilterOp,
    FloatSummary,
    FloatTrajectory,
    GeoBBox,
    HealthStatus,
    PointPage,
    ProfileDerived,
    ProfileLevel,
    ProviderCapability,
    ProviderMetadata,
    QCFlag,
    QuerySpec,
    QuerySummary,
    TimeRange,
    TrajectoryPoint,
    VariableDescriptor,
    VariableStats,
)
from app.services.profiles import derive_profile

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "data" / "samples"


def _to_iso(value: pd.Timestamp) -> str:
    return pd.Timestamp(value).tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%SZ")


def _clean(value: object) -> float | None:
    """NaN -> None. Pydantic would accept NaN and it would serialise to invalid JSON."""
    if value is None:
        return None
    number = float(value)
    return None if np.isnan(number) else number


class FrameBackedProvider(DataProvider):
    def __init__(self, path: str | Path | None = None) -> None:
        self._path = Path(path) if path else self.default_path()
        self._frame: pd.DataFrame | None = None
        self._metadata: ProviderMetadata | None = None
        self._cache_key: str | None = None
        self._cache_frame: pd.DataFrame | None = None

    # ------------------------------------------------------------- lifecycle
    @staticmethod
    def default_path() -> Path:
        """Where this provider looks when no explicit path is configured."""
        raise NotImplementedError

    def _load_frame(self) -> pd.DataFrame:
        """Read the source into the normalised flat schema. Runs off the event loop."""
        raise NotImplementedError

    async def initialize(self) -> None:
        if self._frame is not None:
            return  # idempotent, as the interface requires
        if not self._path.exists():
            raise FileNotFoundError(
                f"Data source missing: {self._path}. "
                r"Run '.\make.ps1 fetch-data' then '.\make.ps1 seed'."
            )
        frame = await asyncio.to_thread(self._load_frame)
        if frame.empty:
            raise ValueError(f"{self._path} produced no usable measurements")
        frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
        frame = frame.sort_values(["wmo_id", "cycle_number", "depth_m"], ignore_index=True)
        self._frame = frame
        self._metadata = self._build_metadata(frame)

    @property
    def frame(self) -> pd.DataFrame:
        if self._frame is None:
            raise RuntimeError("provider used before initialize()")
        return self._frame

    def _build_metadata(self, frame: pd.DataFrame) -> ProviderMetadata:
        variables: list[VariableDescriptor] = list(CORE_VARIABLES)
        # Any numeric column beyond the core set is surfaced as an extra, so a future
        # fixture carrying oxygen or chlorophyll reaches the UI with no code change.
        known = {"latitude", "longitude", "cycle_number", "level_index", "pressure_dbar"}
        core_keys = {v.key for v in variables}
        for column in frame.columns:
            if column in known or column in core_keys:
                continue
            if pd.api.types.is_numeric_dtype(frame[column]):
                variables.append(
                    VariableDescriptor(
                        key=column,
                        display_name=column.replace("_", " ").title(),
                        unit="",
                        min_value=_clean(frame[column].min()),
                        max_value=_clean(frame[column].max()),
                        colormap="viridis",
                        is_extra=True,
                    )
                )
        return ProviderMetadata(
            provider_id=self.provider_id,
            record_count=len(frame),
            float_count=int(frame["wmo_id"].nunique()),
            bbox=GeoBBox(
                min_lat=float(frame["latitude"].min()),
                max_lat=float(frame["latitude"].max()),
                min_lon=float(frame["longitude"].min()),
                max_lon=float(frame["longitude"].max()),
            ),
            time_range=TimeRange(
                start=_to_iso(frame["timestamp"].min()), end=_to_iso(frame["timestamp"].max())
            ),
            depth_range_m=DepthRange(
                min_m=float(frame["depth_m"].min()), max_m=float(frame["depth_m"].max())
            ),
            variables=variables,
            capabilities=[
                ProviderCapability.SERVER_SIDE_FILTERING,
                ProviderCapability.AGGREGATION,
            ],
        )

    def describe(self) -> ProviderMetadata:
        if self._metadata is None:
            raise RuntimeError("provider used before initialize()")
        return self._metadata

    async def health(self) -> HealthStatus:
        if self._frame is None:
            return HealthStatus(healthy=False, detail="not initialised")
        return HealthStatus(
            healthy=True, detail=f"{len(self._frame):,} measurements from {self._path.name}"
        )

    # ---------------------------------------------------------------- filters
    @staticmethod
    def _apply_spec(frame: pd.DataFrame, spec: QuerySpec) -> pd.DataFrame:
        mask = pd.Series(True, index=frame.index)

        if spec.bbox is not None:
            box = spec.bbox
            mask &= frame["latitude"].between(box.min_lat, box.max_lat)
            if box.min_lon <= box.max_lon:
                mask &= frame["longitude"].between(box.min_lon, box.max_lon)
            else:
                # Wrapped across the antimeridian: the box is two spans, not one.
                # Treating it as a single range here would silently drop every point
                # in the equatorial Pacific fixture that sits east of the dateline.
                mask &= (frame["longitude"] >= box.min_lon) | (frame["longitude"] <= box.max_lon)

        if spec.depth_range_m is not None:
            mask &= frame["depth_m"].between(spec.depth_range_m.min_m, spec.depth_range_m.max_m)

        if spec.time_range is not None:
            start = pd.Timestamp(spec.time_range.start)
            end = pd.Timestamp(spec.time_range.end)
            mask &= frame["timestamp"].between(start, end)

        if spec.wmo_ids:
            mask &= frame["wmo_id"].isin(spec.wmo_ids)

        for filt in spec.variable_filters:
            if filt.variable not in frame.columns:
                continue  # unknown variable narrows nothing; the engine warns instead
            column = frame[filt.variable]
            match filt.op:
                case FilterOp.GT:
                    mask &= column > filt.value
                case FilterOp.GTE:
                    mask &= column >= filt.value
                case FilterOp.LT:
                    mask &= column < filt.value
                case FilterOp.LTE:
                    mask &= column <= filt.value
                case FilterOp.EQ:
                    mask &= np.isclose(column, filt.value)
                case FilterOp.BETWEEN:
                    high = filt.value2 if filt.value2 is not None else filt.value
                    low, high = sorted((filt.value, high))
                    mask &= column.between(low, high)

        return frame[mask]

    def _matched(self, spec: QuerySpec) -> pd.DataFrame:
        """Filter, memoising the last spec so query_points and summarize share one pass."""
        key = spec.model_dump_json()
        if self._cache_key == key and self._cache_frame is not None:
            return self._cache_frame
        frame = self._apply_spec(self.frame, spec)
        self._cache_key, self._cache_frame = key, frame
        return frame

    # ----------------------------------------------------------------- points
    async def query_points(self, spec: QuerySpec) -> PointPage:
        matched = await asyncio.to_thread(self._matched, spec)
        total = len(matched)
        limited = matched.head(spec.limit)
        return PointPage(
            points=[self._row_to_point(row) for row in limited.itertuples(index=False)],
            total_matched=total,
            truncated=total > len(limited),
        )

    @staticmethod
    def _row_to_point(row: object):
        from app.schemas.argo import ArgoFloatPoint

        return ArgoFloatPoint(
            point_id=f"{row.wmo_id}:{row.cycle_number}:{row.level_index}",
            wmo_id=str(row.wmo_id),
            cycle_number=int(row.cycle_number),
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            depth_m=float(row.depth_m),
            pressure_dbar=_clean(row.pressure_dbar),
            timestamp=_to_iso(row.timestamp),
            temperature_c=_clean(row.temperature_c),
            salinity_psu=_clean(row.salinity_psu),
            qc_flag=QCFlag(str(row.qc_flag)),
            anomaly_tags=[],
            extras={},
        )

    async def summarize(self, spec: QuerySpec) -> QuerySummary | None:
        """Aggregate over the whole match, so counts are not distorted by truncation."""
        matched = await asyncio.to_thread(self._matched, spec)
        if matched.empty:
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

        stats: list[VariableStats] = []
        for key in ("temperature_c", "salinity_psu"):
            column = matched[key].dropna()
            stats.append(
                VariableStats(
                    variable=key,
                    count=int(column.size),
                    min=round(float(column.min()), 3) if column.size else None,
                    max=round(float(column.max()), 3) if column.size else None,
                    mean=round(float(column.mean()), 3) if column.size else None,
                )
            )

        floats = int(matched["wmo_id"].nunique())
        cycles = int(matched.groupby(["wmo_id", "cycle_number"], observed=True).ngroups)
        start, end = matched["timestamp"].min(), matched["timestamp"].max()
        return QuerySummary(
            answer=(
                f"{len(matched):,} measurements from {floats} float"
                f"{'s' if floats != 1 else ''} across {cycles:,} profiles, "
                f"{_to_iso(start)[:10]} to {_to_iso(end)[:10]}."
            ),
            matched_points=len(matched),
            matched_floats=floats,
            matched_cycles=cycles,
            time_range=TimeRange(start=_to_iso(start), end=_to_iso(end)),
            depth_range_m=DepthRange(
                min_m=round(float(matched["depth_m"].min()), 2),
                max_m=round(float(matched["depth_m"].max()), 2),
            ),
            bbox=GeoBBox(
                min_lat=round(float(matched["latitude"].min()), 4),
                max_lat=round(float(matched["latitude"].max()), 4),
                min_lon=round(float(matched["longitude"].min()), 4),
                max_lon=round(float(matched["longitude"].max()), 4),
            ),
            variable_stats=stats,
        )

    # ------------------------------------------------------------- aggregates
    async def list_floats(self, spec: QuerySpec | None = None) -> list[FloatSummary]:
        frame = self._apply_spec(self.frame, spec) if spec else self.frame
        if frame.empty:
            return []
        summaries = []
        for wmo, group in frame.groupby("wmo_id", observed=True):
            last = group.loc[group["timestamp"].idxmax()]
            summaries.append(
                FloatSummary(
                    wmo_id=str(wmo),
                    cycle_count=int(group["cycle_number"].nunique()),
                    first_seen=_to_iso(group["timestamp"].min()),
                    last_seen=_to_iso(group["timestamp"].max()),
                    last_latitude=float(last["latitude"]),
                    last_longitude=float(last["longitude"]),
                    data_mode=DataMode(str(last["data_mode"])),
                )
            )
        return sorted(summaries, key=lambda s: s.wmo_id)

    async def get_trajectory(
        self, wmo_id: str, time_range: TimeRange | None = None
    ) -> FloatTrajectory | None:
        frame = self.frame[self.frame["wmo_id"] == wmo_id]
        if time_range is not None:
            frame = frame[
                frame["timestamp"].between(
                    pd.Timestamp(time_range.start), pd.Timestamp(time_range.end)
                )
            ]
        if frame.empty:
            return None

        # One fix per cycle, taken from the shallowest measurement - that is the
        # surface position, and it is what a trajectory line should follow.
        shallowest = frame.loc[frame.groupby("cycle_number", observed=True)["depth_m"].idxmin()]
        shallowest = shallowest.sort_values("timestamp")
        points = [
            TrajectoryPoint(
                cycle_number=int(row.cycle_number),
                latitude=float(row.latitude),
                longitude=float(row.longitude),
                timestamp=_to_iso(row.timestamp),
                surface_temperature_c=_clean(row.temperature_c),
            )
            for row in shallowest.itertuples(index=False)
        ]
        return FloatTrajectory(
            wmo_id=wmo_id,
            points=points,
            start_time=points[0].timestamp,
            end_time=points[-1].timestamp,
            bbox=GeoBBox(
                min_lat=float(shallowest["latitude"].min()),
                max_lat=float(shallowest["latitude"].max()),
                min_lon=float(shallowest["longitude"].min()),
                max_lon=float(shallowest["longitude"].max()),
            ),
            cycle_count=len(points),
        )

    async def get_profile(self, wmo_id: str, cycle_number: int) -> DepthProfile | None:
        frame = self.frame[
            (self.frame["wmo_id"] == wmo_id) & (self.frame["cycle_number"] == cycle_number)
        ].sort_values("depth_m")
        if frame.empty:
            return None
        head = frame.iloc[0]
        levels = [
            ProfileLevel(
                depth_m=float(row.depth_m),
                pressure_dbar=_clean(row.pressure_dbar),
                temperature_c=_clean(row.temperature_c),
                salinity_psu=_clean(row.salinity_psu),
                qc_flag=QCFlag(str(row.qc_flag)),
                extras={},
            )
            for row in frame.itertuples(index=False)
        ]
        return DepthProfile(
            wmo_id=wmo_id,
            cycle_number=int(cycle_number),
            timestamp=_to_iso(head["timestamp"]),
            latitude=float(head["latitude"]),
            longitude=float(head["longitude"]),
            data_mode=DataMode(str(head["data_mode"])),
            levels=levels,
            derived=derive_profile(levels),
            anomaly_tags=[],
        )


__all__ = ["ACCEPTABLE_QC", "AnomalyTag", "FrameBackedProvider", "ProfileDerived"]
