"""Runtime configuration. Every switch in the system lives here and nowhere else."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Pluggable implementations, resolved from the registries at startup ---
    data_provider: str = "parquet"
    nlp_parser: str = "rule"
    anomaly_detectors: str = "surface_heatwave,salinity_outlier"

    # --- Data ---
    fixture_path: Path | None = None

    # --- API ---
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    default_limit: int = 50_000
    max_limit: int = 500_000

    @property
    def detector_list(self) -> list[str]:
        return [n.strip() for n in self.anomaly_detectors.split(",") if n.strip()]

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
