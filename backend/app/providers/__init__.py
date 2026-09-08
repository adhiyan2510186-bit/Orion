"""Provider registry.

Importing the concrete modules here is what makes their @register_provider decorators
run. A provider whose module is never imported is invisible to the registry, which is
the most common wiring bug in this design.
"""

from app.providers import netcdf_provider, parquet_provider  # noqa: F401
from app.providers.base import DataProvider
from app.providers.registry import available_providers, create_provider, register_provider

__all__ = ["DataProvider", "available_providers", "create_provider", "register_provider"]
