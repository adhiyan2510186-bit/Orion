"""Generate frontend/types/argo.ts from contracts/*.schema.json.

Emits interfaces, string-literal union enums, and lightweight runtime type guards.
Field names stay snake_case: the wire format is snake_case in both languages and
there is deliberately no camelCase translation layer, because translation layers
are where contracts rot.
"""

from __future__ import annotations

import re
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

SCALARS = {"string": "string", "number": "number", "integer": "number", "boolean": "boolean"}


def ts_type(node: dict[str, Any], defs: dict[str, Any]) -> str:
    """Render one schema node as a TypeScript type expression."""
    if (target := ref_name(node)) is not None:
        return target
    if (target := nullable_ref(node)) is not None:
        return f"{target} | null"

    types = type_list(node)
    nullable = "null" in types
    concrete = [t for t in types if t != "null"]

    if not concrete:
        return "unknown"

    if len(concrete) > 1:
        rendered = " | ".join(SCALARS.get(t, "unknown") for t in concrete)
        return f"{rendered} | null" if nullable else rendered

    kind = concrete[0]
    if kind == "array":
        inner = ts_type(node.get("items", {}), defs)
        # Parenthesise unions so `A | null[]` never happens.
        rendered = f"({inner})[]" if "|" in inner else f"{inner}[]"
    elif kind == "object":
        extra = node.get("additionalProperties")
        rendered = (
            f"Record<string, {ts_type(extra, defs)}>"
            if isinstance(extra, dict)
            else "Record<string, unknown>"
        )
    else:
        rendered = SCALARS.get(kind, "unknown")

    return f"{rendered} | null" if nullable else rendered


def jsdoc(text: str | None, indent: str = "") -> list[str]:
    if not text:
        return []
    words, lines, current = text.split(), [], ""
    for word in words:
        if len(current) + len(word) + 1 > 92:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    if len(lines) == 1:
        return [f"{indent}/** {lines[0]} */"]
    return [f"{indent}/**", *[f"{indent} * {line}" for line in lines], f"{indent} */"]


def main() -> int:
    defs, version = load_defs()
    out: list[str] = [
        "/* eslint-disable */",
        "// " + BANNER.replace("\n", "\n// "),
        "",
        f'export const SCHEMA_VERSION = "{version}" as const;',
        "",
    ]

    guards: list[str] = []

    for name, node in defs.items():
        if is_enum(node):
            out.extend(jsdoc(node.get("description")))
            values = node["enum"]
            union = " | ".join(f'"{v}"' for v in values)
            out.append(f"export type {name} = {union};")
            # camel/Pascal -> SCREAMING_SNAKE, keeping acronyms intact so that
            # QCFlag becomes QC_FLAG rather than Q_C_FLAG.
            const_name = re.sub(
                r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", "_", name
            ).upper()
            listed = ", ".join(f'"{v}"' for v in values)
            out.append(
                f"export const {const_name}_VALUES: readonly {name}[] = [{listed}] as const;"
            )
            out.append("")
            continue

        if node.get("type") != "object":
            continue

        out.extend(jsdoc(node.get("description")))
        out.append(f"export interface {name} {{")
        required = set(node.get("required", []))
        for field, spec in node.get("properties", {}).items():
            out.extend(jsdoc(spec.get("description"), "  "))
            optional = "" if field in required else "?"
            out.append(f"  {field}{optional}: {ts_type(spec, defs)};")
        out.append("}")
        out.append("")

        if required:
            checks = " &&\n    ".join(f'"{f}" in o' for f in sorted(required))
            guards.append(
                f"export function is{name}(v: unknown): v is {name} {{\n"
                f'  if (typeof v !== "object" || v === null) return false;\n'
                f"  const o = v as Record<string, unknown>;\n"
                f"  return (\n    {checks}\n  );\n"
                f"}}\n"
            )

    out.append("// ---------------------------------------------------------------------------")
    out.append("// Runtime guards. Shape checks only - presence of every required field.")
    out.append("// Intended for development-mode validation at the transport boundary, where")
    out.append("// a malformed payload should fail loudly rather than surface as a blank panel.")
    out.append("// ---------------------------------------------------------------------------")
    out.append("")
    out.extend(guards)

    target = REPO_ROOT / "frontend" / "types" / "argo.ts"
    changed = write_if_changed(target, "\n".join(out).rstrip() + "\n")
    print(f"{'wrote' if changed else 'unchanged'}  {target.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
