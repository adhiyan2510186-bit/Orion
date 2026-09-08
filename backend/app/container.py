"""Dependency wiring. Resolves the configured implementations exactly once."""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.parsers import create_parser
from app.parsers.base import NLPParser
from app.providers import create_provider
from app.providers.base import DataProvider
from app.services.anomaly import AnomalyDetector, build_detectors
from app.services.query_engine import QueryEngine


@dataclass
class Container:
    provider: DataProvider
    parser: NLPParser
    detectors: list[AnomalyDetector]
    engine: QueryEngine


_container: Container | None = None


async def build_container() -> Container:
    global _container
    if _container is not None:
        return _container

    kwargs = {"path": settings.fixture_path} if settings.fixture_path else {}
    provider = create_provider(settings.data_provider, **kwargs)
    await provider.initialize()

    parser = create_parser(settings.nlp_parser)
    detectors = build_detectors(settings.detector_list)
    _container = Container(
        provider=provider,
        parser=parser,
        detectors=detectors,
        engine=QueryEngine(provider, detectors),
    )
    return _container


def get_container() -> Container:
    if _container is None:
        raise RuntimeError("container not built; the app lifespan did not run")
    return _container


async def reset_container() -> None:
    """Test hook - drops the singleton so a fresh provider can be wired."""
    global _container
    if _container is not None:
        await _container.provider.close()
    _container = None
