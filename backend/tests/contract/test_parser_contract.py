"""The shared parser contract suite, plus the golden query set.

Every registered parser runs these. When an LLM parser is added it must pass the *same*
golden set the rule parser passes before it can be promoted - that comparison is the
only honest way to tell whether a new parser is actually better.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.parsers import create_parser
from app.parsers.base import ParseContext
from app.parsers.registry import available_parsers
from app.providers import create_provider
from app.schemas.argo import FilterOp

PARSERS = ["rule"]


@pytest.fixture(scope="module")
async def context() -> ParseContext:
    provider = create_provider("parquet")
    await provider.initialize()
    return ParseContext(
        metadata=provider.describe(),
        now=datetime(2026, 9, 9, tzinfo=UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        anomaly_codes=["SURFACE_HEATWAVE", "SALINITY_OUTLIER"],
    )


@pytest.fixture(params=PARSERS)
def parser(request):
    return create_parser(request.param)


def test_every_registered_parser_is_covered():
    assert set(available_parsers()) <= set(PARSERS)


# --------------------------------------------------------------------------- #
# Golden set: query -> what must be true of the resulting spec
# --------------------------------------------------------------------------- #


async def test_the_headline_demo_query(parser, context):
    """The example from PROJECT_CONTEXT. If this regresses, the demo is broken."""
    result = await parser.parse("marine heatwaves near the equator in 2026", context)
    spec = result.spec
    assert spec.bbox is not None and spec.bbox.min_lat == -5 and spec.bbox.max_lat == 5
    assert spec.time_range is not None and spec.time_range.start.startswith("2026")
    # A heatwave is surface-anomalous warmth, so the phrase must imply BOTH a threshold
    # and a depth band. Expanding only one of them would quietly return deep water.
    assert spec.depth_range_m is not None and spec.depth_range_m.max_m <= 10.0
    assert any(f.variable == "temperature_c" and f.op == FilterOp.GT for f in spec.variable_filters)
    assert result.confidence > 0.6


@pytest.mark.parametrize(
    "query,check",
    [
        ("show float 5906548", lambda s: s.wmo_ids == ["5906548"]),
        ("floats 5906548 and 5905315", lambda s: len(s.wmo_ids) == 2),
        (
            "temperature above 29 in the equatorial Pacific",
            lambda s: s.bbox is not None and s.bbox.min_lon > s.bbox.max_lon,
        ),  # wraps dateline
        ("salinity below 34", lambda s: s.variable_filters[0].variable == "salinity_psu"),
        ("between 100 and 500 metres", lambda s: s.depth_range_m.min_m == 100),
        ("deeper than 500 m", lambda s: s.depth_range_m.min_m == 500),
        ("shallower than 50 m", lambda s: s.depth_range_m.max_m == 50),
        ("at the surface", lambda s: s.depth_range_m.max_m == 10),
        ("in the North Atlantic", lambda s: s.bbox.min_lat == 0),
        ("since 2024", lambda s: s.time_range.start.startswith("2024")),
        ("between 2023 and 2025", lambda s: s.time_range.end.startswith("2025")),
        ("in March 2024", lambda s: s.time_range.start.startswith("2024-03")),
        ("in the last 6 months", lambda s: s.time_range is not None),
        ("top 100 measurements", lambda s: s.limit == 100),
        ("warmer than 28.5 C", lambda s: s.variable_filters[0].value == 28.5),
        ("colder than 5 C", lambda s: s.variable_filters[0].op == FilterOp.LT),
    ],
)
async def test_golden_queries(parser, context, query, check):
    result = await parser.parse(query, context)
    assert check(result.spec), f"{parser.parser_id} mis-parsed {query!r}: {result.spec}"


async def test_depth_and_temperature_comparisons_are_disambiguated_by_unit(parser, context):
    """'below 500 m' is a depth; 'below 20 C' is a temperature. Units decide."""
    depth = await parser.parse("below 500 m", context)
    assert depth.spec.depth_range_m is not None and depth.spec.depth_range_m.min_m == 500
    assert not depth.spec.variable_filters

    temp = await parser.parse("below 20 C", context)
    assert temp.spec.variable_filters and temp.spec.variable_filters[0].variable == "temperature_c"


async def test_unknown_phrases_are_reported_not_silently_dropped(parser, context):
    """A confident wrong answer is worse than an admitted gap."""
    result = await parser.parse("sea ice extent near Antarctica last Tuesday", context)
    assert result.unresolved, "parser must say what it could not interpret"
    assert result.confidence < 0.5


async def test_parser_never_invents_a_variable_the_provider_lacks(parser, context):
    """ParseContext exists precisely to prevent this."""
    result = await parser.parse("show me chlorophyll above 2", context)
    for filt in result.spec.variable_filters:
        assert context.has_variable(filt.variable)


async def test_empty_query_yields_a_valid_broad_spec(parser, context):
    result = await parser.parse("", context)
    assert result.spec.limit > 0
    assert result.confidence < 0.3


async def test_result_is_always_schema_valid(parser, context):
    for query in ["", "nonsense wobble", "marine heatwaves", "float 9999999 in 1823"]:
        result = await parser.parse(query, context)
        assert 0.0 <= result.confidence <= 1.0
        assert result.parser_id == parser.parser_id
        assert isinstance(result.unresolved, list)
        assert result.rationale
