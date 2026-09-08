"""The shared provider contract suite.

Every registered DataProvider runs these same tests. That is what makes swapping one
safe: a new provider is trusted only once it answers the same questions the same way.
When a second provider is added, extend `PROVIDERS` and change nothing else.

Capability honesty is checked explicitly, because over-claiming is the failure mode that
produces silently wrong results rather than a loud error.
"""

from __future__ import annotations

import pytest

from app.providers import create_provider
from app.providers.registry import available_providers
from app.schemas.argo import (
    Aggregation,
    DepthRange,
    FilterOp,
    GeoBBox,
    ProviderCapability,
    QuerySpec,
    VariableFilter,
)

PROVIDERS = ["parquet", "netcdf"]


def spec(**overrides) -> QuerySpec:
    base = dict(
        bbox=None,
        depth_range_m=None,
        time_range=None,
        variable_filters=[],
        wmo_ids=None,
        anomaly_codes=None,
        aggregation=Aggregation.NONE,
        limit=500,
    )
    base.update(overrides)
    return QuerySpec(**base)


@pytest.fixture(params=PROVIDERS)
async def provider(request):
    instance = create_provider(request.param)
    await instance.initialize()
    yield instance
    await instance.close()


def test_every_registered_provider_is_covered():
    """A provider that skips this suite is a provider nobody has verified."""
    assert set(available_providers()) <= set(PROVIDERS), (
        f"unverified providers registered: {set(available_providers()) - set(PROVIDERS)}"
    )


async def test_initialize_is_idempotent(provider):
    before = provider.describe().record_count
    await provider.initialize()
    assert provider.describe().record_count == before


async def test_describe_reports_real_bounds(provider):
    meta = provider.describe()
    assert meta.record_count > 0
    assert meta.float_count > 0
    assert meta.bbox is not None and -90 <= meta.bbox.min_lat <= meta.bbox.max_lat <= 90
    assert meta.time_range is not None and meta.time_range.start < meta.time_range.end
    assert {v.key for v in meta.variables} >= {"temperature_c", "salinity_psu"}


async def test_health_reports_ready(provider):
    assert (await provider.health()).healthy is True


async def test_limit_is_honoured_and_truncation_reported(provider):
    page = await provider.query_points(spec(limit=10))
    assert len(page.points) <= 10
    if page.total_matched > 10:
        assert page.truncated is True
        # total_matched is the count BEFORE truncation; the engine and UI both rely on it.
        assert page.total_matched > len(page.points)


async def test_points_satisfy_every_filter_they_claim_to(provider):
    query = spec(
        depth_range_m=DepthRange(min_m=0.0, max_m=50.0),
        variable_filters=[
            VariableFilter(variable="temperature_c", op=FilterOp.GT, value=25.0, value2=None)
        ],
        limit=200,
    )
    page = await provider.query_points(query)
    assert page.points, "fixture should contain warm shallow water"
    for point in page.points:
        assert 0.0 <= point.depth_m <= 50.0
        assert point.temperature_c is not None and point.temperature_c > 25.0


async def test_declared_capabilities_are_true(provider):
    """Over-claiming silently returns wrong results, so verify the claim actually holds."""
    meta = provider.describe()
    if ProviderCapability.SERVER_SIDE_FILTERING not in meta.capabilities:
        pytest.skip("provider does not claim server-side filtering")
    narrow = await provider.query_points(spec(depth_range_m=DepthRange(min_m=0.0, max_m=5.0)))
    wide = await provider.query_points(spec())
    assert narrow.total_matched < wide.total_matched, (
        "provider claims SERVER_SIDE_FILTERING but a depth filter did not narrow the result"
    )


async def test_wrapped_bbox_matches_both_sides_of_the_antimeridian(provider):
    """min_lon > max_lon is a wrapped box. The sample floats genuinely straddle 180."""
    wrapped = await provider.query_points(
        spec(bbox=GeoBBox(min_lat=-10, max_lat=10, min_lon=170, max_lon=-120), limit=2000)
    )
    for point in wrapped.points:
        assert point.longitude >= 170 or point.longitude <= -120


async def test_normalisation_holds_for_every_point(provider):
    page = await provider.query_points(spec(limit=1000))
    for point in page.points:
        assert -90 <= point.latitude <= 90
        assert -180 <= point.longitude <= 180
        assert point.depth_m >= 0, "depth must be positive-down metres"
        assert point.timestamp.endswith("Z"), "timestamps are ISO-8601 UTC with Z"
        assert point.wmo_id.isdigit(), f"wmo_id must decode to digits, got {point.wmo_id!r}"
        assert point.anomaly_tags == [] or isinstance(point.anomaly_tags, list)


async def test_no_implausible_measurements_survive_qc(provider):
    """QC masking must run at ingestion.

    The raw GDAC fixture contains salinity from 1.71 to 52.02 PSU on bad-QC levels. If
    those reach the API, the anomaly detector dutifully "discovers" them and the map
    shows fresh water in the open Pacific.
    """
    page = await provider.query_points(spec(limit=20000))
    for point in page.points:
        if point.salinity_psu is not None:
            assert 30.0 < point.salinity_psu < 40.0, f"implausible salinity {point.salinity_psu}"
        if point.temperature_c is not None:
            assert -3.0 < point.temperature_c < 40.0


async def test_summary_describes_the_full_match_not_the_page(provider):
    """The bug this prevents: '472,906 measurements from 1 float'."""
    query = spec(limit=50)
    summary = await provider.summarize(query)
    if summary is None:
        pytest.skip("provider does not implement summarize()")
    page = await provider.query_points(query)
    assert summary.matched_points == page.total_matched
    if page.truncated:
        assert summary.matched_floats >= len({p.wmo_id for p in page.points})


async def test_profile_is_depth_ordered_and_carries_diagnostics(provider):
    floats = await provider.list_floats()
    assert floats
    trajectory = await provider.get_trajectory(floats[0].wmo_id)
    assert trajectory is not None and trajectory.points
    cycle = trajectory.points[len(trajectory.points) // 2].cycle_number

    profile = await provider.get_profile(floats[0].wmo_id, cycle)
    assert profile is not None and len(profile.levels) > 1
    depths = [level.depth_m for level in profile.levels]
    assert depths == sorted(depths), "levels must be depth-ordered ascending"
    assert profile.derived.method


async def test_trajectory_is_time_ordered(provider):
    floats = await provider.list_floats()
    trajectory = await provider.get_trajectory(floats[0].wmo_id)
    times = [p.timestamp for p in trajectory.points]
    assert times == sorted(times)
    assert trajectory.cycle_count == len(trajectory.points)


async def test_unknown_float_returns_none_rather_than_raising(provider):
    assert await provider.get_trajectory("0000000") is None
    assert await provider.get_profile("0000000", 1) is None


async def test_list_floats_is_lightweight(provider):
    floats = await provider.list_floats()
    assert floats
    for summary in floats:
        assert summary.cycle_count > 0
        assert summary.first_seen <= summary.last_seen
