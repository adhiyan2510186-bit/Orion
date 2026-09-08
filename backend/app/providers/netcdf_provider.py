"""NetCDF-backed provider reading genuine, unmodified GDAC files.

This is the provider that demonstrates real ARGO telemetry ingestion end to end: it
parses `<wmo>_prof.nc` exactly as downloaded from the Ifremer GDAC, with no
pre-processing step in between.

It also demonstrates that the adapter architecture works. Swapping the entire data
source is `DATA_PROVIDER=netcdf` plus this file, which contains no query logic at all -
it shares every filter, aggregate and diagnostic with the Parquet provider and passes
the identical contract suite. That was the whole point of the abstraction.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.domain.argo_netcdf import read_many
from app.providers.frame_provider import SAMPLES_DIR, FrameBackedProvider
from app.providers.registry import register_provider


@register_provider("netcdf")
class NetCDFProvider(FrameBackedProvider):
    """Reads every `*_prof.nc` under a directory, or a single file."""

    @staticmethod
    def default_path() -> Path:
        return SAMPLES_DIR

    def _load_frame(self) -> pd.DataFrame:
        if self._path.is_dir():
            files = sorted(self._path.glob("*.nc"))
            if not files:
                raise FileNotFoundError(
                    rf"No .nc files in {self._path}. Run '.\make.ps1 fetch-data' to "
                    "download real ARGO profiles from the Ifremer GDAC."
                )
        else:
            files = [self._path]
        # Parsing is slower than a columnar read - roughly a second per float - which is
        # exactly why the Parquet fixture exists for the demo path. Correctness is
        # identical; only startup cost differs.
        return read_many(files)
