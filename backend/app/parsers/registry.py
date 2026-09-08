"""Registry of NLPParser implementations. Mirrors the provider registry exactly."""

from __future__ import annotations

from collections.abc import Callable

from app.parsers.base import NLPParser

_REGISTRY: dict[str, type[NLPParser]] = {}


def register_parser(name: str) -> Callable[[type[NLPParser]], type[NLPParser]]:
    def decorate(cls: type[NLPParser]) -> type[NLPParser]:
        if name in _REGISTRY and _REGISTRY[name] is not cls:
            raise RuntimeError(f"parser {name!r} is already registered")
        cls.parser_id = name
        _REGISTRY[name] = cls
        return cls

    return decorate


def available_parsers() -> list[str]:
    return sorted(_REGISTRY)


def create_parser(name: str, **kwargs: object) -> NLPParser:
    try:
        cls = _REGISTRY[name]
    except KeyError:
        known = ", ".join(available_parsers()) or "<none registered>"
        raise KeyError(
            f"unknown NLP_PARSER {name!r}. Registered: {known}. "
            "If the parser exists, check that app/parsers/__init__.py imports it."
        ) from None
    return cls(**kwargs)
