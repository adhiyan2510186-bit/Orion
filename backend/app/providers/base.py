"""The DataProvider interface.

Everything about *where ARGO data comes from* lives behind this class. A new source is
one new file plus one config value; if adding one requires editing `api/`, `services/`
or anything in `frontend/`, the abstraction has been bypassed.

The load-bearing rule is capability honesty. `describe().capabilities` advertises what
the provider can do natively, and `QueryEngine` applies in-process whatever is missing.
Under-claiming only costs performance. **Over-claiming silently returns wrong results**,
because the engine will skip a filter it believes was already applied.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.argo import (
    DepthProfile,
    FloatSummary,
    FloatTrajectory,
    HealthStatus,
    PointPage,
    ProviderMetadata,
    QuerySpec,
    QuerySummary,
    TimeRange,
)


class DataProvider(ABC):
    """A source of ARGO measurements.

    Implementations must pass the shared contract suite in `tests/contract/` before
    being registered. That suite is what makes swapping a provider safe: every
    implementation answers the same questions the same way.
    """

    #: Registry key. Set by @register_provider.
    provider_id: str = "abstract"

    @abstractmethod
    async def initialize(self) -> None:
        """Load or connect. Called once at startup. Must be idempotent."""

    @abstractmethod
    async def query_points(self, spec: QuerySpec) -> PointPage:
        """Return measurements matching `spec`.

        Must honour `spec.limit`, and must report `total_matched` (the count *before*
        truncation) and `truncated` honestly - the engine and the UI both trust them.
        """

    @abstractmethod
    async def get_trajectory(
        self, wmo_id: str, time_range: TimeRange | None = None
    ) -> FloatTrajectory | None:
        """Surface positions for one float, time-ordered ascending. None if unknown."""

    @abstractmethod
    async def get_profile(self, wmo_id: str, cycle_number: int) -> DepthProfile | None:
        """One cast, depth-ordered ascending. None if that cycle does not exist."""

    @abstractmethod
    async def list_floats(self, spec: QuerySpec | None = None) -> list[FloatSummary]:
        """Lightweight float summaries. Must never return measurement arrays."""

    @abstractmethod
    def describe(self) -> ProviderMetadata:
        """Bounds, variable descriptors, record counts, and capability flags.

        Feeds both the UI's dynamic controls and the parser's context, so it must
        reflect what is actually loaded rather than what the source could contain.
        """

    @abstractmethod
    async def health(self) -> HealthStatus:
        """Readiness probe. Network failures belong here, not in every query."""

    async def summarize(self, spec: QuerySpec) -> QuerySummary | None:
        """Aggregate statistics over the FULL match, not the truncated page.

        Optional. Returning None is honest and safe: the engine falls back to computing
        statistics from the returned sample and warns that it did so. Implement this
        wherever the provider can aggregate cheaply, because sample-based statistics on
        a truncated result are actively misleading - "472,906 measurements from 1 float"
        is the failure this exists to prevent.
        """
        return None

    async def close(self) -> None:
        """Release handles or connections. Safe default: nothing to release."""
        return None
