"""Read a real ARGO `<wmo>_prof.nc` file into a normalised flat table.

One reader, used by both `scripts/seed_sample_data.py` (to build the committed Parquet
fixture) and `providers/netcdf_provider.py` (to serve NetCDF directly). Writing it twice
would guarantee the two paths eventually disagree about what the same file means.

Every quirk handled here was observed in genuine GDAC files, not anticipated:
byte-wrapped identifiers, float cycle numbers, NaT timestamps, ragged level padding,
and adjusted-vs-raw variable selection.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

from app.domain.units import (
    ACCEPTABLE_QC_CODES,
    data_mode_from_code,
    decode_char_array,
    depth_from_pressure,
    normalize_longitude,
    qc_from_code,
    scrub_sentinels,
)

# Columns every downstream consumer can rely on.
FLAT_COLUMNS = [
    "wmo_id",
    "cycle_number",
    "latitude",
    "longitude",
    "timestamp",
    "pressure_dbar",
    "depth_m",
    "temperature_c",
    "salinity_psu",
    "qc_flag",
    "data_mode",
    "level_index",
]

_MEASURED = {"PRES": "pressure_dbar", "TEMP": "temperature_c", "PSAL": "salinity_psu"}


def _select_values(ds: xr.Dataset, var: str, modes: np.ndarray) -> np.ndarray:
    """Prefer `<VAR>_ADJUSTED` wherever the profile is not real-time.

    ARGO delayed-mode and adjusted profiles carry calibrated values in the `_ADJUSTED`
    variant; the raw field is uncorrected. Publishing raw values for a delayed-mode
    profile means presenting uncalibrated measurements as if they were validated, which
    is a scientific error rather than a rounding one.
    """
    raw = scrub_sentinels(ds[var].values)
    adjusted_name = f"{var}_ADJUSTED"
    if adjusted_name not in ds.variables:
        return raw
    adjusted = scrub_sentinels(ds[adjusted_name].values)
    prefer = (modes != "R")[:, None] & ~np.isnan(adjusted)
    return np.where(prefer, adjusted, raw)


def _select_qc(ds: xr.Dataset, var: str, modes: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    """Mirror the adjusted/raw choice for the matching QC field."""
    raw_name, adjusted_name = f"{var}_QC", f"{var}_ADJUSTED_QC"
    if raw_name not in ds.variables:
        return np.full(shape, "", dtype=object)
    raw = decode_char_array(ds[raw_name].values)
    if adjusted_name in ds.variables:
        adjusted = decode_char_array(ds[adjusted_name].values)
        prefer = (modes != "R")[:, None] & (adjusted != "")
        return np.where(prefer, adjusted, raw)
    return raw


def read_profile_file(path: str | Path) -> pd.DataFrame:
    """Flatten one ARGO profile file to one row per (profile, level) measurement."""
    with xr.open_dataset(path, decode_timedelta=False) as ds:
        n_prof = int(ds.sizes["N_PROF"])
        if n_prof == 0:
            return pd.DataFrame(columns=FLAT_COLUMNS)

        wmo_ids = decode_char_array(ds["PLATFORM_NUMBER"].values)
        modes = (
            decode_char_array(ds["DATA_MODE"].values)
            if "DATA_MODE" in ds.variables
            else np.full(n_prof, "R")
        )

        # CYCLE_NUMBER is float64 in real files. Casting without the nan guard raises.
        cycles = np.nan_to_num(np.asarray(ds["CYCLE_NUMBER"].values, dtype="float64"), nan=-1)
        cycles = cycles.astype("int32")

        latitude = np.asarray(ds["LATITUDE"].values, dtype="float64")
        longitude = normalize_longitude(ds["LONGITUDE"].values)
        timestamps = pd.to_datetime(ds["JULD"].values, utc=True, errors="coerce")

        measured = {column: _select_values(ds, var, modes) for var, column in _MEASURED.items()}
        shape = measured["pressure_dbar"].shape

        # Apply each variable's own QC flag before anything else sees the values.
        # Without this, measurements flagged BAD by the DAC flow straight through:
        # the raw fixture contained salinity from 1.71 to 52.02 PSU, which is not
        # seawater. Masking here means a bad cast becomes null - an honest absence -
        # rather than an outlier the anomaly detector would dutifully "discover".
        qc_codes = {var: _select_qc(ds, var, modes, shape) for var in _MEASURED}
        for var, column in _MEASURED.items():
            acceptable = np.isin(qc_codes[var], list(ACCEPTABLE_QC_CODES))
            measured[column] = np.where(acceptable, measured[column], np.nan)

        pressure = measured["pressure_dbar"]

        # A level is real when it has a pressure. Everything else is ragged padding.
        prof_idx, level_idx = np.where(~np.isnan(pressure))
        if prof_idx.size == 0:
            return pd.DataFrame(columns=FLAT_COLUMNS)

        # The row-level flag reports temperature QC, the variable the demo query
        # filters on. Per-variable masking above has already nulled unusable values.
        temp_qc = qc_codes["TEMP"]

        frame = pd.DataFrame(
            {
                "wmo_id": pd.Series(wmo_ids[prof_idx], dtype="string"),
                "cycle_number": cycles[prof_idx].astype("int32"),
                "latitude": latitude[prof_idx].astype("float32"),
                "longitude": longitude[prof_idx].astype("float32"),
                "timestamp": timestamps[prof_idx],
                "pressure_dbar": pressure[prof_idx, level_idx].astype("float32"),
                "temperature_c": measured["temperature_c"][prof_idx, level_idx].astype("float32"),
                "salinity_psu": measured["salinity_psu"][prof_idx, level_idx].astype("float32"),
                "qc_flag": pd.Series(
                    [qc_from_code(c).value for c in temp_qc[prof_idx, level_idx]], dtype="string"
                ),
                "data_mode": pd.Series(
                    [data_mode_from_code(m).value for m in modes[prof_idx]], dtype="string"
                ),
                "level_index": level_idx.astype("int32"),
            }
        )

    frame["depth_m"] = depth_from_pressure(
        frame["pressure_dbar"].to_numpy(), frame["latitude"].to_numpy()
    ).astype("float32")

    # A measurement with no valid time cannot be placed on the 4th axis, and a fabricated
    # timestamp would corrupt every temporal query. Drop rather than invent.
    frame = frame.dropna(subset=["timestamp"])
    frame = frame[np.isfinite(frame["latitude"]) & np.isfinite(frame["longitude"])]
    return frame.loc[:, FLAT_COLUMNS].reset_index(drop=True)


def read_many(paths: list[Path]) -> pd.DataFrame:
    frames = [read_profile_file(p) for p in paths]
    frames = [f for f in frames if not f.empty]
    if not frames:
        return pd.DataFrame(columns=FLAT_COLUMNS)
    return pd.concat(frames, ignore_index=True)
