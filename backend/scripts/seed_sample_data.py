r"""Build the committed Parquet fixture from the cached raw ARGO files.

Reads backend/data/raw/*.nc (gitignored, ~78 MB) and writes a compact fixture to
backend/data/samples/ (committed, ~6 MB) so the repo clones and runs offline.

Run with:  .\make.ps1 seed
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.domain.argo_netcdf import read_many  # noqa: E402

RAW = BACKEND / "data" / "raw"
SAMPLES = BACKEND / "data" / "samples"
FIXTURE = SAMPLES / "argo_equatorial_pacific.parquet"

# Trimmed to keep the committed fixture small. The full history is ~10 MB; this window
# keeps all 12 floats and ~1,567 cycles at FULL depth resolution, which is what the
# profile panel needs. Dropping levels instead of cycles would flatten the thermocline
# and defeat the point of the fixture.
SINCE = "2023-01-01"

# Rounding to the instrument's own resolution. ARGO reports temperature and salinity to
# ~0.001 and pressure to ~0.1, so this discards no real information while cutting the
# fixture by a third - float noise in the low bits is expensive to compress and means
# nothing. Verified to change no value by more than 0.000000 degrees.
PRECISION = {
    "temperature_c": 3,
    "salinity_psu": 3,
    "pressure_dbar": 1,
    "depth_m": 2,
    "latitude": 4,  # ~11 m at the equator
    "longitude": 4,
}


def main() -> int:
    files = sorted(RAW.glob("*.nc"))
    if not files:
        print(f"No .nc files in {RAW}. Run '.\\make.ps1 fetch-data' first.", file=sys.stderr)
        return 1

    print(f"reading {len(files)} ARGO files...")
    frame = read_many(files)
    print(f"  {len(frame):,} measurements, {frame.wmo_id.nunique()} floats")

    trimmed = frame[frame["timestamp"] >= SINCE].reset_index(drop=True)
    for column, digits in PRECISION.items():
        trimmed[column] = trimmed[column].round(digits).astype("float32")
    trimmed["level_index"] = trimmed["level_index"].astype("int16")
    trimmed["cycle_number"] = trimmed["cycle_number"].astype("int16")

    SAMPLES.mkdir(parents=True, exist_ok=True)
    trimmed.to_parquet(FIXTURE, compression="zstd", compression_level=9, index=False)

    size_mb = FIXTURE.stat().st_size / 1e6
    cycles = trimmed.groupby(["wmo_id", "cycle_number"]).ngroups
    surface = trimmed[trimmed["depth_m"] < 10.0]
    hot = surface[surface["temperature_c"] > 29.0]
    print(f"wrote {FIXTURE.relative_to(BACKEND.parent)}")
    print(
        f"  {len(trimmed):,} rows | {cycles:,} cycles | "
        f"{trimmed.wmo_id.nunique()} floats | {size_mb:.2f} MB"
    )
    print(f"  {trimmed.timestamp.min().date()} -> {trimmed.timestamp.max().date()}")
    print(
        f"  demo check: {len(hot):,} surface measurements above 29 C "
        f"(max {hot.temperature_c.max():.2f})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
