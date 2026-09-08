"""Shared schema loading for the codegen scripts.

Both generators read the same merged view of contracts/*.schema.json so that the
TypeScript and Pydantic outputs cannot drift apart. Output ordering is fully
deterministic - the `make contracts` gate requires a second run to produce a
zero diff, which is only possible if generation is a pure function of the input.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONTRACTS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = CONTRACTS_DIR.parent

# Fixed order. Never sort - insertion order in the JSON files is the intended
# reading order, and stability matters more than alphabetisation.
SCHEMA_FILES = ("argo.schema.json", "query.schema.json")

BANNER = (
    "GENERATED FILE - DO NOT EDIT.\n"
    "Source of truth: contracts/*.schema.json\n"
    "Regenerate with `make contracts`. CI fails if this file differs from a fresh run."
)


def load_defs() -> tuple[dict[str, Any], str]:
    """Merge $defs from every schema file into one namespace.

    The two files split domain entities from the query envelope for readability,
    but they share a single `#/$defs/X` namespace so that cross-file references
    stay simple. A duplicate name across files is a hard error - silently letting
    one shadow the other is exactly the kind of drift this pipeline exists to stop.
    """
    defs: dict[str, Any] = {}
    versions: set[str] = set()
    for name in SCHEMA_FILES:
        raw = json.loads((CONTRACTS_DIR / name).read_text(encoding="utf-8"))
        versions.add(raw.get("x-schema-version", "0.0.0"))
        for key, value in raw.get("$defs", {}).items():
            if key in defs:
                raise SystemExit(f"duplicate $defs entry {key!r} across schema files")
            defs[key] = value
    if len(versions) != 1:
        raise SystemExit(f"schema files disagree on x-schema-version: {sorted(versions)}")
    return defs, versions.pop()


def ref_name(node: dict[str, Any]) -> str | None:
    """Return the target name of a `$ref`, or None."""
    ref = node.get("$ref")
    if not ref:
        return None
    if not ref.startswith("#/$defs/"):
        raise SystemExit(f"unsupported $ref {ref!r} - only #/$defs/NAME is handled")
    return ref.split("/")[-1]


def nullable_ref(node: dict[str, Any]) -> str | None:
    """Detect the `oneOf: [{$ref}, {type: null}]` nullable-reference shape."""
    branches = node.get("oneOf")
    if not branches or len(branches) != 2:
        return None
    names = [ref_name(b) for b in branches]
    has_null = any(b.get("type") == "null" for b in branches)
    target = next((n for n in names if n), None)
    return target if (has_null and target) else None


def type_list(node: dict[str, Any]) -> list[str]:
    """Normalise `type` to a list, so scalar and nullable forms share a code path."""
    t = node.get("type")
    if t is None:
        return []
    return list(t) if isinstance(t, list) else [t]


def is_enum(node: dict[str, Any]) -> bool:
    return "enum" in node and node.get("type") == "string"


def write_if_changed(path: Path, content: str) -> bool:
    """Write only when content differs. Returns True if the file changed.

    Normalises to LF so the check-in state is stable across platforms; on Windows
    a naive write would flip line endings every run and break the idempotence gate.
    """
    content = content.replace("\r\n", "\n")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8").replace("\r\n", "\n") == content:
        return False
    path.write_text(content, encoding="utf-8", newline="\n")
    return True
