"""Depth-profile diagnostics: thermocline, halocline, mixed layer.

Every value here is nullable, and that is deliberate. A cast that is too shallow, too
sparse, or missing salinity genuinely cannot support the calculation, and returning a
fabricated depth would be worse than returning nothing - a scientist would read it as
a measurement. `ProfileDerived.method` names the algorithm so a future change to it is
visible in the data rather than silent.
"""

from __future__ import annotations

import numpy as np

from app.schemas.argo import ProfileDerived, ProfileLevel

METHOD = "max-gradient/mld-0.2C-v1"

# The de Boyer Montegut (2004) threshold criterion: the mixed layer ends where
# temperature has departed from a near-surface reference by 0.2 C.
MLD_TEMPERATURE_THRESHOLD_C = 0.2
MLD_REFERENCE_DEPTH_M = 10.0

# Below this many valid levels a gradient is noise rather than structure.
MIN_LEVELS_FOR_GRADIENT = 5


def _clean_pairs(levels: list[ProfileLevel], attribute: str) -> tuple[np.ndarray, np.ndarray]:
    depths, values = [], []
    for level in levels:
        value = getattr(level, attribute)
        if value is None or level.depth_m is None:
            continue
        depths.append(level.depth_m)
        values.append(value)
    if not depths:
        return np.empty(0), np.empty(0)
    order = np.argsort(depths)
    return np.asarray(depths)[order], np.asarray(values)[order]


def _max_gradient_depth(
    depths: np.ndarray, values: np.ndarray, *, want_negative: bool
) -> tuple[float | None, float | None]:
    """Depth of the steepest change, and the gradient there.

    `want_negative` selects a thermocline (temperature falling with depth) rather than
    a halocline, where the sign of the interesting gradient varies by water mass.
    """
    if depths.size < MIN_LEVELS_FOR_GRADIENT:
        return None, None
    spacing = np.diff(depths)
    valid = spacing > 0
    if not valid.any():
        return None, None
    gradient = np.divide(np.diff(values), spacing, out=np.full(spacing.shape, np.nan), where=valid)
    if np.all(np.isnan(gradient)):
        return None, None
    target = -gradient if want_negative else np.abs(gradient)
    index = int(np.nanargmax(target))
    midpoint = float((depths[index] + depths[index + 1]) / 2.0)
    return midpoint, float(gradient[index])


def _mixed_layer_depth(depths: np.ndarray, temps: np.ndarray) -> float | None:
    """First depth where temperature departs from the 10 m reference by the threshold."""
    if depths.size < 3:
        return None
    reference_index = int(np.argmin(np.abs(depths - MLD_REFERENCE_DEPTH_M)))
    reference = temps[reference_index]
    departures = np.abs(temps - reference)
    beyond = np.where(
        (departures >= MLD_TEMPERATURE_THRESHOLD_C) & (depths > depths[reference_index])
    )[0]
    if beyond.size == 0:
        return None
    return float(depths[int(beyond[0])])


def derive_profile(levels: list[ProfileLevel]) -> ProfileDerived:
    depths_t, temps = _clean_pairs(levels, "temperature_c")
    depths_s, salts = _clean_pairs(levels, "salinity_psu")

    thermocline, gradient = _max_gradient_depth(depths_t, temps, want_negative=True)
    halocline, _ = _max_gradient_depth(depths_s, salts, want_negative=False)
    mld = _mixed_layer_depth(depths_t, temps) if depths_t.size else None
    surface = float(temps[0]) if temps.size else None

    return ProfileDerived(
        thermocline_depth_m=thermocline,
        halocline_depth_m=halocline,
        mixed_layer_depth_m=mld,
        max_temperature_gradient_c_per_m=gradient,
        surface_temperature_c=surface,
        method=METHOD,
    )
