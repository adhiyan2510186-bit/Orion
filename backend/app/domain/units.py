"""Canonical units, QC normalisation, and variable metadata.

Everything in this module exists so that the messiness of real GDAC files stops at
the provider boundary. Nothing downstream should ever see a byte string, a `-999`,
a decibar, or a DAC-specific variable spelling.
"""

from __future__ import annotations

import numpy as np

from app.schemas.argo import DataMode, QCFlag, VariableDescriptor

# --------------------------------------------------------------------------- #
# Quality control
# --------------------------------------------------------------------------- #

# GDAC reference table 2. Anything unrecognised becomes UNKNOWN rather than being
# guessed at - a wrong QC flag is worse than an honest absence of one.
_QC_BY_CODE: dict[str, QCFlag] = {
    "1": QCFlag.GOOD,
    "2": QCFlag.PROBABLY_GOOD,
    "3": QCFlag.PROBABLY_BAD,
    "4": QCFlag.BAD,
    "5": QCFlag.CHANGED,
    "8": QCFlag.ESTIMATED,
    "9": QCFlag.MISSING,
}

# Flags a scientist would accept without further scrutiny.
ACCEPTABLE_QC = frozenset({QCFlag.GOOD, QCFlag.PROBABLY_GOOD, QCFlag.CHANGED})

# The same set as raw GDAC codes, for masking arrays before they become models.
# An empty code means the file carried no QC for that variable; that is "unknown",
# not "bad", so it is kept rather than silently discarding an entire dataset.
ACCEPTABLE_QC_CODES = frozenset({"1", "2", "5", ""})

_DATA_MODE_BY_CODE: dict[str, DataMode] = {
    "R": DataMode.REAL_TIME,
    "A": DataMode.ADJUSTED,
    "D": DataMode.DELAYED,
}


def qc_from_code(code: str | None) -> QCFlag:
    if not code:
        return QCFlag.UNKNOWN
    return _QC_BY_CODE.get(str(code).strip()[:1], QCFlag.UNKNOWN)


def data_mode_from_code(code: str | None) -> DataMode:
    if not code:
        return DataMode.UNKNOWN
    return _DATA_MODE_BY_CODE.get(str(code).strip()[:1].upper(), DataMode.UNKNOWN)


# --------------------------------------------------------------------------- #
# Byte decoding
# --------------------------------------------------------------------------- #


def decode_char_array(values: object) -> np.ndarray:
    """Decode a NetCDF character/object array to stripped unicode strings.

    ARGO stores `PLATFORM_NUMBER`, `DATA_MODE` and every `*_QC` field as bytes, but
    xarray surfaces them with dtype ``object`` rather than ``S``. A ``dtype.kind == "S"``
    check therefore fails *silently* and yields ids like ``np.bytes_(b'3902367 ')``,
    which then propagate into point ids and URLs. This handles both layouts.
    """
    array = np.asarray(values)
    if array.dtype == object:
        flat = [
            item.decode("utf-8", "replace") if isinstance(item, bytes | np.bytes_) else str(item)
            for item in array.ravel()
        ]
        array = np.array(flat, dtype=str).reshape(array.shape)
    elif array.dtype.kind == "S":
        array = np.char.decode(array, "utf-8", "replace")
    return np.char.strip(array.astype(str))


# --------------------------------------------------------------------------- #
# Pressure -> depth
# --------------------------------------------------------------------------- #


def depth_from_pressure(pressure_dbar: np.ndarray, latitude: np.ndarray) -> np.ndarray:
    """Convert pressure (decibar) to depth (metres, positive down).

    UNESCO / Fofonoff & Millard (1983). Latitude matters because gravity varies with
    it: the naive ``depth = pressure * 1.02`` approximation is off by several metres
    at 2000 dbar, which is enough to shift a reported thermocline depth.
    """
    p = np.asarray(pressure_dbar, dtype="float64")
    lat = np.asarray(latitude, dtype="float64")
    x = np.sin(np.deg2rad(lat)) ** 2
    gravity = 9.780318 * (1.0 + (5.2788e-3 + 2.36e-5 * x) * x) + 1.092e-6 * p
    numerator = (((-1.82e-15 * p + 2.279e-10) * p - 2.2512e-5) * p + 9.72659) * p
    return numerator / gravity


# --------------------------------------------------------------------------- #
# Sentinels
# --------------------------------------------------------------------------- #

# Real GDAC files carry these as "no data". They must become null before leaving the
# provider, or a -999 temperature silently becomes the coldest point on the map.
_SENTINELS = (-999.0, -999.9, -9999.0, 9999.0, 99999.0)


def scrub_sentinels(values: np.ndarray) -> np.ndarray:
    out = np.asarray(values, dtype="float64").copy()
    for sentinel in _SENTINELS:
        out[np.isclose(out, sentinel, rtol=0, atol=1e-3)] = np.nan
    out[np.abs(out) > 1e30] = np.nan
    return out


def normalize_longitude(lon: np.ndarray) -> np.ndarray:
    """Wrap to [-180, 180]. GDAC files are inconsistent about 0-360 vs -180-180."""
    return ((np.asarray(lon, dtype="float64") + 180.0) % 360.0) - 180.0


# --------------------------------------------------------------------------- #
# Variable catalogue
# --------------------------------------------------------------------------- #

# Ranges are display bounds for colour scales, not validation limits. They are set
# from what the equatorial Pacific fixture actually contains, widened to sensible
# global values, so the default colormap is not dominated by one outlier.
CORE_VARIABLES: list[VariableDescriptor] = [
    VariableDescriptor(
        key="temperature_c",
        display_name="Temperature",
        unit="°C",
        min_value=-2.0,
        max_value=32.0,
        colormap="thermal",
        is_extra=False,
    ),
    VariableDescriptor(
        key="salinity_psu",
        display_name="Salinity",
        unit="PSU",
        min_value=32.0,
        max_value=37.5,
        colormap="haline",
        is_extra=False,
    ),
    VariableDescriptor(
        key="depth_m",
        display_name="Depth",
        unit="m",
        min_value=0.0,
        max_value=2000.0,
        colormap="dense",
        is_extra=False,
    ),
]

# GDAC spellings differ across DACs. Resolving aliases here keeps that mess confined
# to the domain layer rather than leaking into every provider.
VARIABLE_ALIASES: dict[str, str] = {
    "temp": "temperature_c",
    "temperature": "temperature_c",
    "sea_water_temperature": "temperature_c",
    "sst": "temperature_c",
    "psal": "salinity_psu",
    "salinity": "salinity_psu",
    "practical_salinity": "salinity_psu",
    "pres": "pressure_dbar",
    "pressure": "pressure_dbar",
    "depth": "depth_m",
    "doxy": "oxygen_umol_kg",
    "oxygen": "oxygen_umol_kg",
    "chla": "chla_mg_m3",
    "chlorophyll": "chla_mg_m3",
    "nitrate": "nitrate_umol_kg",
    "ph_in_situ_total": "ph_total",
}


def canonical_variable(name: str) -> str:
    key = name.strip().lower()
    return VARIABLE_ALIASES.get(key, key)
