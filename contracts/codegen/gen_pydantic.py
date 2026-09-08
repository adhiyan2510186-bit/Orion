"""Generate backend/app/schemas/argo.py from contracts/*.schema.json.

Emits Pydantic v2 models and str-Enums. `from __future__ import annotations` in the
output means declaration order never matters, so the generator can emit definitions
in schema order rather than solving a topological sort.
"""

from __future__ import annotations

import sys
from typing import Any

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))

from _schema import (
    BANNER,
    REPO_ROOT,
    is_enum,
    load_defs,
    nullable_ref,
    ref_name,
    type_list,
    write_if_changed,
)

SCALARS = {"string": "str", "number": "float", "integer": "int", "boolean": "bool"}


def py_type(node: dict[str, Any]) -> str:
    if (target := ref_name(node)) is not None:
        return target
    if (target := nullable_ref(node)) is not None:
        return f"{target} | None"

    types = type_list(node)
    nullable = "null" in types
    concrete = [t for t in types if t != "null"]
    if not concrete:
        return "Any"

    kind = concrete[0]
    if kind == "array":
        rendered = f"list[{py_type(node.get('items', {}))}]"
    elif kind == "object":
        extra = node.get("additionalProperties")
        rendered = f"dict[str, {py_type(extra)}]" if isinstance(extra, dict) else "dict[str, Any]"
    else:
        rendered = SCALARS.get(kind, "Any")

    return f"{rendered} | None" if nullable else rendered


def field_args(spec: dict[str, Any], required: bool) -> str:
    """Build the Field(...) call, carrying JSON Schema constraints into validation."""
    parts: list[str] = []
    default = "..." if required else "None"
    parts.append(default)

    # Range constraints only apply to a bare numeric; on a nullable or list field
    # Pydantic would reject them, so they are dropped rather than mis-applied.
    types = [t for t in type_list(spec) if t != "null"]
    scalar_numeric = types in (["number"], ["integer"]) and "null" not in type_list(spec)
    if scalar_numeric:
        if "minimum" in spec:
            parts.append(f"ge={spec['minimum']}")
        if "maximum" in spec:
            parts.append(f"le={spec['maximum']}")
    if types == ["string"] and "null" not in type_list(spec):
        if "minLength" in spec:
            parts.append(f"min_length={spec['minLength']}")
        if "maxLength" in spec:
            parts.append(f"max_length={spec['maxLength']}")

    if desc := spec.get("description"):
        escaped = desc.replace("\\", "\\\\").replace('"', '\\"')
        parts.append(f'description="{escaped}"')
    return ", ".join(parts)


def wrap(text: str, width: int, indent: str) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        if len(current) + len(word) + 1 > width:
            lines.append(indent + current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(indent + current)
    return lines


def main() -> int:
    defs, version = load_defs()
    out: list[str] = [
        '"""' + BANNER,
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from enum import Enum",
        "from typing import Any",
        "",
        "from pydantic import BaseModel, ConfigDict, Field",
        "",
        f'SCHEMA_VERSION = "{version}"',
        "",
        "",
    ]

    for name, node in defs.items():
        if is_enum(node):
            out.append(f"class {name}(str, Enum):")
            if desc := node.get("description"):
                out.append('    """')
                out.extend(wrap(desc, 88, "    "))
                out.append('    """')
                out.append("")
            for value in node["enum"]:
                out.append(f'    {value.upper()} = "{value}"')
            out.extend(["", ""])
            continue

        if node.get("type") != "object":
            continue

        out.append(f"class {name}(BaseModel):")
        if desc := node.get("description"):
            out.append('    """')
            out.extend(wrap(desc, 88, "    "))
            out.append('    """')
            out.append("")

        # additionalProperties:false in the schema means a typo in an inbound field
        # is an error rather than silently ignored data.
        strict = node.get("additionalProperties") is False
        out.append(f'    model_config = ConfigDict(extra="{"forbid" if strict else "allow"}")')
        out.append("")

        required = set(node.get("required", []))
        props = node.get("properties", {})
        if not props:
            out.append("    pass")
        for field, spec in props.items():
            annotation = py_type(spec)
            if field not in required and not annotation.endswith("| None"):
                annotation = f"{annotation} | None"
            out.append(f"    {field}: {annotation} = Field({field_args(spec, field in required)})")
        out.extend(["", ""])

    target = REPO_ROOT / "backend" / "app" / "schemas" / "argo.py"
    body = "\n".join(out).rstrip() + "\n"
    changed = write_if_changed(target, body)

    init = target.parent / "__init__.py"
    write_if_changed(init, '"""Generated Pydantic schemas. See contracts/."""\n')

    print(f"{'wrote' if changed else 'unchanged'}  {target.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
