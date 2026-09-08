"""Contract-level invariants for the generated types.

These are the tests that make "the schema is the API" a checked property rather than
an intention. They must pass before any provider or parser is trusted.
"""

from __future__ import annotations

import json
import subprocess
import sys
from enum import Enum
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from app.schemas import argo as S

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = REPO_ROOT / "contracts"
GENERATED = [
    REPO_ROOT / "frontend" / "types" / "argo.ts",
    REPO_ROOT / "backend" / "app" / "schemas" / "argo.py",
]


def load_all_defs() -> dict:
    defs: dict = {}
    for name in ("argo.schema.json", "query.schema.json"):
        raw = json.loads((CONTRACTS / name).read_text(encoding="utf-8"))
        defs.update(raw["$defs"])
    return defs


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #


def test_every_definition_generated_a_python_symbol():
    """A $defs entry that produces no symbol means the generator silently skipped it."""
    for name, node in load_all_defs().items():
        symbol = getattr(S, name, None)
        assert symbol is not None, f"{name} is in the schema but not in the generated module"
        if node.get("type") == "object":
            assert issubclass(symbol, BaseModel), f"{name} should be a BaseModel"
        elif "enum" in node:
            assert issubclass(symbol, Enum), f"{name} should be an Enum"


def test_codegen_is_idempotent():
    """The P1 gate. Generation must be a pure function of the schema.

    A second run that alters a file means the output depends on something other than
    the input - iteration order, a timestamp, a path - and the CI drift check becomes
    a source of spurious failures.
    """
    before = {p: p.read_bytes() for p in GENERATED}
    for script in ("gen_typescript.py", "gen_pydantic.py"):
        result = subprocess.run(
            [sys.executable, str(CONTRACTS / "codegen" / script)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"{script} failed:\n{result.stderr}"
    for path, original in before.items():
        assert path.read_bytes() == original, f"{path.name} changed on a second generation run"


def test_generated_files_carry_the_do_not_edit_banner():
    for path in GENERATED:
        assert "DO NOT EDIT" in path.read_text(encoding="utf-8")[:400]


def test_schema_versions_agree():
    versions = {
        json.loads((CONTRACTS / n).read_text(encoding="utf-8"))["x-schema-version"]
        for n in ("argo.schema.json", "query.schema.json")
    }
    assert versions == {S.SCHEMA_VERSION}


# --------------------------------------------------------------------------- #
# Frozen wire conventions
# --------------------------------------------------------------------------- #


def test_all_field_names_are_snake_case():
    """snake_case on the wire in both languages. No camelCase translation layer."""
    for name, node in load_all_defs().items():
        for field in node.get("properties", {}):
            assert field.islower() or "_" in field, f"{name}.{field} is not snake_case"
            assert not any(c.isupper() for c in field), f"{name}.{field} contains uppercase"


def test_array_fields_are_required_so_they_default_to_empty_not_null():
    """Arrays are [] rather than null, so consumers never branch on nullish arrays."""
    exempt = {
        ("QuerySpec", "wmo_ids"),
        ("QuerySpec", "anomaly_codes"),
    }  # null means "unconstrained"
    for name, node in load_all_defs().items():
        required = set(node.get("required", []))
        for field, spec in node.get("properties", {}).items():
            if spec.get("type") == "array" and (name, field) not in exempt:
                assert field in required, f"{name}.{field} is an array but not required"


# --------------------------------------------------------------------------- #
# Runtime behaviour of the generated models
# --------------------------------------------------------------------------- #


def make_point(**overrides) -> dict:
    base = dict(
        point_id="5906548:41:3",
        wmo_id="5906548",
        cycle_number=41,
        latitude=-0.243,
        longitude=-141.882,
        depth_m=4.28,
        pressure_dbar=4.2,
        timestamp="2026-09-06T05:00:00Z",
        temperature_c=29.41,
        salinity_psu=34.812,
        qc_flag="good",
        anomaly_tags=[],
        extras={},
    )
    base.update(overrides)
    return base


def test_point_roundtrips():
    point = S.ArgoFloatPoint(**make_point())
    assert S.ArgoFloatPoint(**point.model_dump(mode="json")) == point


def test_extras_accepts_arbitrary_variables_without_a_schema_change():
    """The extension slot: BGC variables ingest with no contract edit."""
    point = S.ArgoFloatPoint(
        **make_point(extras={"oxygen_umol_kg": 212.4, "chla_mg_m3": 0.18, "nitrate_umol_kg": None})
    )
    assert point.extras["chla_mg_m3"] == 0.18
    assert point.extras["nitrate_umol_kg"] is None


@pytest.mark.parametrize(
    "field,bad",
    [("latitude", 91.0), ("latitude", -91.0), ("longitude", 181.0), ("depth_m", -1.0)],
)
def test_coordinate_bounds_are_enforced(field, bad):
    with pytest.raises(ValidationError):
        S.ArgoFloatPoint(**make_point(**{field: bad}))


def test_missing_values_are_null_not_sentinels():
    point = S.ArgoFloatPoint(**make_point(temperature_c=None, salinity_psu=None))
    assert point.temperature_c is None and point.salinity_psu is None


def test_request_rejects_unknown_fields():
    """extra=forbid, so a client typo fails loudly instead of being ignored."""
    with pytest.raises(ValidationError):
        S.QueryRequest(query="warm water near the equator", filterz={})


def test_wrapped_bbox_is_representable():
    """min_lon > max_lon means the box crosses the antimeridian. The sample floats do."""
    bbox = S.GeoBBox(min_lat=-5, max_lat=5, min_lon=170, max_lon=-120)
    assert bbox.min_lon > bbox.max_lon


def test_anomaly_tag_requires_machine_readable_evidence():
    tag = S.AnomalyTag(
        code="SURFACE_HEATWAVE",
        severity="critical",
        label="Surface heatwave",
        detected_by="surface_heatwave",
        evidence={"observed": 29.41, "threshold": 29.0},
    )
    assert tag.evidence["observed"] > tag.evidence["threshold"]
    with pytest.raises(ValidationError):
        S.AnomalyTag(code="X", severity="critical", label="X", detected_by="d")
