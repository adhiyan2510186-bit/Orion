"""API v1 routes.

Routes stay thin on purpose: parse, delegate, shape the response. Any logic that
appears here is logic that a second transport (a CLI, a websocket) would have to
duplicate, so it belongs in services/ instead.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query

from app.container import get_container
from app.parsers.base import ParseContext
from app.schemas.argo import (
    SCHEMA_VERSION,
    DepthProfile,
    FloatSummary,
    FloatTrajectory,
    MetaResponse,
    QueryRequest,
    QueryResponse,
    ResponseMeta,
)
from app.services.anomaly import available_detectors

router = APIRouter()

EXAMPLE_QUERIES = [
    "marine heatwaves near the equator in 2026",
    "surface temperature above 29 C in the equatorial Pacific",
    "salinity below 34 between 100 and 500 metres",
    "show float 5906548 in the last 6 months",
    "colder than 15 C deeper than 500 m since 2024",
]


def _parse_context() -> ParseContext:
    container = get_container()
    return ParseContext(
        metadata=container.provider.describe(),
        now=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        anomaly_codes=available_detectors(),
    )


@router.get("/meta", response_model=MetaResponse, summary="Dataset and runtime metadata")
async def get_meta() -> MetaResponse:
    """Everything the frontend needs to build its controls without hard-coding them."""
    container = get_container()
    return MetaResponse(
        provider=container.provider.describe(),
        parser=container.parser.parser_id,
        schema_version=SCHEMA_VERSION,
        health=await container.provider.health(),
        example_queries=EXAMPLE_QUERIES,
    )


@router.post("/query", response_model=QueryResponse, summary="Natural-language query")
async def post_query(request: QueryRequest) -> QueryResponse:
    container = get_container()

    parser = container.parser
    if request.options and request.options.parser:
        from app.parsers import available_parsers, create_parser

        if request.options.parser not in available_parsers():
            raise HTTPException(400, f"unknown parser {request.options.parser!r}")
        parser = create_parser(request.options.parser)

    if request.filters is not None:
        # A pre-built spec bypasses the parser entirely. Used by the UI when the user
        # adjusts a filter chip rather than retyping the sentence.
        from app.schemas.argo import ParseResult

        parse = ParseResult(
            spec=request.filters,
            confidence=1.0,
            rationale="Structured filters supplied by the client; parser bypassed.",
            unresolved=[],
            parser_id="explicit",
        )
    else:
        parse = await parser.parse(request.query, _parse_context())

    spec = parse.spec
    if request.options and request.options.limit:
        spec = spec.model_copy(update={"limit": request.options.limit})

    result = await container.engine.execute(spec)

    trajectories: list[FloatTrajectory] = []
    profiles: list[DepthProfile] = []
    if request.options and request.options.include_trajectories:
        wmos = sorted({p.wmo_id for p in result.points})[:25]
        for wmo in wmos:
            if traj := await container.provider.get_trajectory(wmo, spec.time_range):
                trajectories.append(traj)
    if request.options and request.options.include_profiles:
        seen = sorted({(p.wmo_id, p.cycle_number) for p in result.points})[:12]
        for wmo, cycle in seen:
            if profile := await container.provider.get_profile(wmo, cycle):
                profiles.append(profile)

    return QueryResponse(
        spec=spec,
        parse=parse,
        points=result.points,
        trajectories=trajectories,
        profiles=profiles,
        summary=result.summary,
        anomalies=result.anomalies,
        meta=ResponseMeta(
            provider=container.provider.provider_id,
            parser=parse.parser_id,
            latency_ms=result.latency_ms,
            total_matched=result.total_matched,
            truncated=result.truncated,
            warnings=result.warnings,
            schema_version=SCHEMA_VERSION,
        ),
    )


@router.get("/floats", response_model=list[FloatSummary], summary="List floats")
async def list_floats() -> list[FloatSummary]:
    return await get_container().provider.list_floats()


@router.get("/floats/{wmo_id}/trajectory", response_model=FloatTrajectory)
async def get_trajectory(wmo_id: str) -> FloatTrajectory:
    trajectory = await get_container().provider.get_trajectory(wmo_id)
    if trajectory is None:
        raise HTTPException(404, f"no trajectory for float {wmo_id}")
    return trajectory


@router.get("/floats/{wmo_id}/profile", response_model=DepthProfile)
async def get_profile(
    wmo_id: str, cycle: int = Query(..., description="Cycle number")
) -> DepthProfile:
    profile = await get_container().provider.get_profile(wmo_id, cycle)
    if profile is None:
        raise HTTPException(404, f"no profile for float {wmo_id} cycle {cycle}")
    return profile
