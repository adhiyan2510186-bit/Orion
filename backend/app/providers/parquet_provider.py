"""Parquet-backed provider over the committed ARGO fixture. The v0 default.

`IMPLEMENTATION_PLAN.md` originally named a CSV provider; the same data is 159 MB as
CSV against ~6 MB as zstd Parquet, so CSV was never a viable committed fixture.
See docs/adr/0001-parquet-over-csv.md.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.providers.frame_provider import SAMPLES_DIR, FrameBackedProvider
from app.providers.registry import register_provider

FIXTURE = SAMPLES_DIR / "argo_equatorial_pacific.parquet"


@register_provider("parquet")
class ParquetProvider(FrameBackedProvider):
    """Loads the pre-normalised fixture. Startup is a single columnar read."""

    @staticmethod
    def default_path() -> Path:
        return FIXTURE

    def _load_frame(self) -> pd.DataFrame:
        return pd.read_parquet(self._path)
