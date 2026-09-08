"""Registry of DataProvider implementations.

Registries, not conditionals. Adding a provider means adding a file that decorates its
class; no consumer is edited, ever. If you find yourself writing `if provider == "x"`
outside this module, the design has been bypassed.
"""

from __future__ import annotations

from collections.abc import Callable

from app.providers.base import DataProvider

_REGISTRY: dict[str, type[DataProvider]] = {}


def register_provider(name: str) -> Callable[[type[DataProvider]], type[DataProvider]]:
    """Class decorator that makes a provider resolvable by config value."""

    def decorate(cls: type[DataProvider]) -> type[DataProvider]:
        if name in _REGISTRY and _REGISTRY[name] is not cls:
            raise RuntimeError(f"provider {name!r} is already registered")
        cls.provider_id = name
        _REGISTRY[name] = cls
        return cls

    return decorate


def available_providers() -> list[str]:
    return sorted(_REGISTRY)


def create_provider(name: str, **kwargs: object) -> DataProvider:
    """Instantiate a registered provider.

    Raises with the list of known names rather than a bare KeyError, because the usual
    cause is a typo in .env or a module whose decorator never ran because nothing
    imported it.
    """
    try:
        cls = _REGISTRY[name]
    except KeyError:
        known = ", ".join(available_providers()) or "<none registered>"
        raise KeyError(
            f"unknown DATA_PROVIDER {name!r}. Registered: {known}. "
            "If the provider exists, check that app/providers/__init__.py imports it "
            "so its @register_provider decorator actually runs."
        ) from None
    return cls(**kwargs)
