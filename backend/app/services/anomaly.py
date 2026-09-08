"""Anomaly detectors, as a third registry.

Each detector emits machine-readable `evidence` so the UI can explain *why* a point was
flagged without containing any detector-specific code. A flag a scientist cannot audit
is a flag they will not trust.

Severity is never carried by colour alone downstream - DESIGN.md requires glyph, label
and colour together - so `code` and `severity` both matter.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable

from app.schemas.argo import AnomalySeverity, AnomalyTag, ArgoFloatPoint

SURFACE_DEPTH_M = 10.0


class AnomalyDetector(ABC):
    detector_id: str = "abstract"

    @abstractmethod
    def detect(self, point: ArgoFloatPoint) -> AnomalyTag | None: ...

    def describe(self) -> dict[str, object]:
        return {"id": self.detector_id}


_REGISTRY: dict[str, type[AnomalyDetector]] = {}


def register_detector(name: str) -> Callable[[type[AnomalyDetector]], type[AnomalyDetector]]:
    def decorate(cls: type[AnomalyDetector]) -> type[AnomalyDetector]:
        cls.detector_id = name
        _REGISTRY[name] = cls
        return cls

    return decorate


def available_detectors() -> list[str]:
    return sorted(_REGISTRY)


def build_detectors(names: list[str]) -> list[AnomalyDetector]:
    missing = [n for n in names if n not in _REGISTRY]
    if missing:
        raise KeyError(f"unknown detectors {missing}. Registered: {available_detectors()}")
    return [_REGISTRY[n]() for n in names]


@register_detector("surface_heatwave")
class SurfaceHeatwaveDetector(AnomalyDetector):
    """Anomalously warm water in the near-surface layer.

    29 C is the conventional working threshold for tropical surface heatwave screening.
    It is configurable because the right value is regional, and hard-coding one would
    make this detector wrong everywhere except the equatorial Pacific.
    """

    def __init__(self, threshold_c: float = 29.0, max_depth_m: float = SURFACE_DEPTH_M) -> None:
        self.threshold_c = threshold_c
        self.max_depth_m = max_depth_m

    def detect(self, point: ArgoFloatPoint) -> AnomalyTag | None:
        if point.temperature_c is None or point.depth_m > self.max_depth_m:
            return None
        if point.temperature_c <= self.threshold_c:
            return None
        excess = point.temperature_c - self.threshold_c
        return AnomalyTag(
            code="SURFACE_HEATWAVE",
            severity=AnomalySeverity.CRITICAL if excess >= 1.0 else AnomalySeverity.WARNING,
            label="Surface heatwave",
            detected_by=self.detector_id,
            evidence={
                "observed_c": round(point.temperature_c, 3),
                "threshold_c": self.threshold_c,
                "excess_c": round(excess, 3),
                "depth_m": round(point.depth_m, 1),
            },
        )


@register_detector("salinity_outlier")
class SalinityOutlierDetector(AnomalyDetector):
    """Salinity outside the plausible open-ocean envelope.

    A wide static envelope, deliberately: it catches sensor drift and bad casts without
    pretending to know regional climatology, which this build does not carry.
    """

    def __init__(self, low_psu: float = 31.0, high_psu: float = 38.0) -> None:
        self.low_psu = low_psu
        self.high_psu = high_psu

    def detect(self, point: ArgoFloatPoint) -> AnomalyTag | None:
        value = point.salinity_psu
        if value is None or self.low_psu <= value <= self.high_psu:
            return None
        return AnomalyTag(
            code="SALINITY_OUTLIER",
            severity=AnomalySeverity.WARNING,
            label="Salinity outlier",
            detected_by=self.detector_id,
            evidence={
                "observed_psu": round(value, 3),
                "low_psu": self.low_psu,
                "high_psu": self.high_psu,
            },
        )


@register_detector("cold_anomaly")
class ColdAnomalyDetector(AnomalyDetector):
    """Unusually cold surface water - the other half of a heatwave study."""

    def __init__(self, threshold_c: float = 20.0, max_depth_m: float = SURFACE_DEPTH_M) -> None:
        self.threshold_c = threshold_c
        self.max_depth_m = max_depth_m

    def detect(self, point: ArgoFloatPoint) -> AnomalyTag | None:
        if point.temperature_c is None or point.depth_m > self.max_depth_m:
            return None
        if point.temperature_c >= self.threshold_c:
            return None
        return AnomalyTag(
            code="COLD_SURFACE_ANOMALY",
            severity=AnomalySeverity.INFO,
            label="Cold surface anomaly",
            detected_by=self.detector_id,
            evidence={
                "observed_c": round(point.temperature_c, 3),
                "threshold_c": self.threshold_c,
                "depth_m": round(point.depth_m, 1),
            },
        )
