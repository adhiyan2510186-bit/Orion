"""End-to-end API tests against the real fixture."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def query(client, text, **options):
    payload = {
        "query": text,
        "options": {
            "limit": options.get("limit", 2000),
            "include_profiles": options.get("include_profiles", False),
            "include_trajectories": options.get("include_trajectories", False),
            "parser": options.get("parser"),
        },
    }
    response = client.post("/api/v1/query", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_meta_exposes_everything_the_ui_needs_to_build_itself(client):
    body = client.get("/api/v1/meta").json()
    assert body["provider"]["record_count"] > 100_000
    assert body["health"]["healthy"] is True
    assert body["example_queries"], "the UI seeds its prompt chips from these"
    # The UI generates variable controls from descriptors, so each needs a colormap.
    for variable in body["provider"]["variables"]:
        assert variable["colormap"]
        assert variable["key"]


def test_every_example_query_actually_returns_results(client):
    """An example that returns nothing makes the product look broken on first use."""
    for text in client.get("/api/v1/meta").json()["example_queries"]:
        body = query(client, text)
        assert body["summary"]["matched_points"] > 0, f"example returned nothing: {text!r}"


def test_headline_demo_query_finds_real_heatwave_measurements(client):
    body = query(client, "marine heatwaves near the equator in 2026")
    assert body["summary"]["matched_points"] > 0
    assert any(a["code"] == "SURFACE_HEATWAVE" for a in body["anomalies"])
    for point in body["points"]:
        assert point["depth_m"] <= 10.0
        assert point["temperature_c"] > 29.0
        assert point["anomaly_tags"], "every returned point should carry its flag"


def test_anomaly_tags_carry_auditable_evidence(client):
    body = query(client, "marine heatwaves near the equator in 2026")
    tag = next(a for a in body["anomalies"] if a["code"] == "SURFACE_HEATWAVE")
    assert tag["evidence"]["observed_c"] > tag["evidence"]["threshold_c"]
    assert tag["detected_by"]


def test_response_meta_makes_the_swap_observable(client):
    body = query(client, "surface temperature above 29 C")
    assert body["meta"]["provider"] == "parquet"
    assert body["meta"]["parser"] == "rule"
    assert body["meta"]["schema_version"]


def test_unparseable_query_is_honest_rather_than_confident(client):
    body = query(client, "sea ice extent near Antarctica last Tuesday")
    assert body["parse"]["unresolved"]
    assert body["parse"]["confidence"] < 0.5


def test_explicit_filters_bypass_the_parser(client):
    spec = {
        "bbox": None,
        "depth_range_m": {"min_m": 0.0, "max_m": 5.0},
        "time_range": None,
        "variable_filters": [],
        "wmo_ids": None,
        "anomaly_codes": None,
        "aggregation": "none",
        "limit": 100,
    }
    response = client.post("/api/v1/query", json={"query": "ignored", "filters": spec})
    body = response.json()
    assert body["parse"]["parser_id"] == "explicit"
    assert all(p["depth_m"] <= 5.0 for p in body["points"])


def test_profiles_and_trajectories_on_demand(client):
    body = query(
        client, "show float 5906548", limit=500, include_profiles=True, include_trajectories=True
    )
    assert body["trajectories"] and body["profiles"]
    profile = body["profiles"][0]
    depths = [level["depth_m"] for level in profile["levels"]]
    assert depths == sorted(depths)
    assert profile["derived"]["method"]


def test_float_endpoints(client):
    floats = client.get("/api/v1/floats").json()
    assert floats
    wmo = floats[0]["wmo_id"]
    assert client.get(f"/api/v1/floats/{wmo}/trajectory").status_code == 200
    assert client.get("/api/v1/floats/0000000/trajectory").status_code == 404


def test_malformed_request_is_rejected(client):
    assert client.post("/api/v1/query", json={"query": "x", "bogus": 1}).status_code == 422
    assert client.post("/api/v1/query", json={}).status_code == 422
