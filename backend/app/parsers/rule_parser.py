"""Deterministic rule-based natural-language parser.

No network, no API key, no per-query cost, and it cannot fail during a demo. It is
not a placeholder for an LLM - it is the permanent fallback that keeps the product
answering when a model is slow, expensive, or down.

The approach: a set of extractors run over the query, each claiming the character
spans it understood. Whatever text is left over and still meaningful is reported in
`unresolved`, so the interface can say what it ignored instead of quietly guessing.
That honesty is the whole design: a confident wrong answer is worse than a question.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from app.parsers.base import NLPParser, ParseContext
from app.parsers.registry import register_parser
from app.schemas.argo import (
    Aggregation,
    DepthRange,
    FilterOp,
    GeoBBox,
    ParseResult,
    QuerySpec,
    TimeRange,
    VariableFilter,
)

DEFAULT_LIMIT = 50_000

# --------------------------------------------------------------------------- #
# Gazetteer
# --------------------------------------------------------------------------- #
# (min_lat, max_lat, min_lon, max_lon). Where min_lon > max_lon the box crosses the
# antimeridian and is evaluated as two OR-ed spans downstream - the Pacific regions
# genuinely need this, and the sample floats sit right on that seam.
REGIONS: dict[str, tuple[float, float, float, float]] = {
    "nino 3.4": (-5, 5, -170, -120),
    "nino3.4": (-5, 5, -170, -120),
    "el nino region": (-5, 5, -170, -120),
    "equatorial pacific": (-5, 5, 120, -70),
    "equator": (-5, 5, -180, 180),
    "equatorial": (-5, 5, -180, 180),
    "tropical pacific": (-23.5, 23.5, 120, -70),
    "north pacific": (0, 65, 120, -100),
    "south pacific": (-60, 0, 150, -70),
    "pacific": (-60, 65, 120, -70),
    "north atlantic": (0, 70, -80, 0),
    "south atlantic": (-60, 0, -70, 20),
    "atlantic": (-60, 70, -80, 20),
    "arabian sea": (5, 25, 50, 78),
    "bay of bengal": (5, 22, 80, 100),
    "indian ocean": (-60, 30, 20, 120),
    "southern ocean": (-80, -45, -180, 180),
    "arctic": (66, 90, -180, 180),
    "mediterranean": (30, 46, -6, 36),
    "gulf of mexico": (18, 31, -98, -80),
    "caribbean": (9, 22, -89, -60),
    "tropics": (-23.5, 23.5, -180, 180),
    "tropical": (-23.5, 23.5, -180, 180),
    "northern hemisphere": (0, 90, -180, 180),
    "southern hemisphere": (-90, 0, -180, 180),
}

MONTHS = {m.lower(): i for i, m in enumerate(calendar.month_name) if m}
MONTHS.update({m.lower(): i for i, m in enumerate(calendar.month_abbr) if m})

# Unit families, used to disambiguate "below 500 m" (a depth) from "below 20 C"
# (a temperature). Without this every comparison is a coin flip.
DEPTH_UNITS = r"(?:m\b|metre?s?\b|meters?\b|dbar\b|decibars?\b)"
TEMP_UNITS = r"(?:°\s*c\b|deg(?:ree)?s?\s*c\b|celsius\b|c\b)"
SALT_UNITS = r"(?:psu\b|practical\s+salinity\b)"

STOPWORDS = frozenset(
    [
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "been",
        "between",
        "by",
        "can",
        "could",
        "did",
        "do",
        "does",
        "for",
        "from",
        "get",
        "give",
        "had",
        "has",
        "have",
        "how",
        "i",
        "in",
        "is",
        "it",
        "its",
        "me",
        "my",
        "near",
        "of",
        "on",
        "or",
        "over",
        "please",
        "show",
        "shows",
        "showing",
        "something",
        "that",
        "the",
        "their",
        "them",
        "then",
        "there",
        "these",
        "they",
        "this",
        "to",
        "was",
        "were",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "will",
        "with",
        "within",
        "would",
        "you",
        "your",
        "data",
        "float",
        "floats",
        "measurement",
        "measurements",
        "point",
        "points",
        "profile",
        "profiles",
        "record",
        "records",
        "reading",
        "readings",
        "find",
        "list",
        "plot",
        "map",
        "display",
        "all",
        "any",
        "some",
        "most",
    ]
)


@dataclass
class _Extraction:
    """Accumulates what the extractors understood, plus the spans they consumed."""

    spans: list[tuple[int, int]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def claim(self, match: re.Match | tuple[int, int], note: str = "") -> None:
        span = match.span() if isinstance(match, re.Match) else match
        self.spans.append(span)
        if note:
            self.notes.append(note)


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


@register_parser("rule")
class RuleParser(NLPParser):
    """Pattern-matching parser over a curated ocean vocabulary."""

    async def parse(self, query: str, context: ParseContext) -> ParseResult:
        text = query.lower().strip()
        ex = _Extraction()

        bbox = self._extract_region(text, ex)
        time_range = self._extract_time(text, ex, context)
        depth_range = self._extract_depth(text, ex)
        wmo_ids = self._extract_wmo(text, ex)
        limit = self._extract_limit(text, ex)
        filters, anomaly_codes, implied_depth = self._extract_thresholds(text, ex, context)

        if depth_range is None and implied_depth is not None:
            depth_range = implied_depth

        spec = QuerySpec(
            bbox=bbox,
            depth_range_m=depth_range,
            time_range=time_range,
            variable_filters=filters,
            wmo_ids=wmo_ids,
            anomaly_codes=anomaly_codes or None,
            aggregation=Aggregation.NONE,
            limit=limit or DEFAULT_LIMIT,
        )

        unresolved = self._unresolved(text, ex)
        confidence = self._confidence(spec, unresolved, ex)
        rationale = (
            "; ".join(ex.notes)
            if ex.notes
            else "No constraints recognised; returning a broad sample."
        )

        return ParseResult(
            spec=spec,
            confidence=confidence,
            rationale=rationale,
            unresolved=unresolved,
            parser_id=self.parser_id,
        )

    # ----------------------------------------------------------------- region
    def _extract_region(self, text: str, ex: _Extraction) -> GeoBBox | None:
        # Longest name first, so "equatorial pacific" wins over "pacific".
        for name in sorted(REGIONS, key=len, reverse=True):
            match = re.search(rf"\b{re.escape(name)}\b", text)
            if match:
                lat0, lat1, lon0, lon1 = REGIONS[name]
                ex.claim(match, f"region '{name}'")
                return GeoBBox(min_lat=lat0, max_lat=lat1, min_lon=lon0, max_lon=lon1)

        explicit = re.search(
            r"(-?\d+(?:\.\d+)?)\s*°?\s*([ns])\s*(?:to|-|and)\s*(-?\d+(?:\.\d+)?)\s*°?\s*([ns])",
            text,
        )
        if explicit:
            a = float(explicit.group(1)) * (1 if explicit.group(2) == "n" else -1)
            b = float(explicit.group(3)) * (1 if explicit.group(4) == "n" else -1)
            ex.claim(explicit, f"latitude band {min(a, b)}..{max(a, b)}")
            return GeoBBox(min_lat=min(a, b), max_lat=max(a, b), min_lon=-180, max_lon=180)
        return None

    # ------------------------------------------------------------------- time
    def _extract_time(self, text: str, ex: _Extraction, context: ParseContext) -> TimeRange | None:
        now = datetime.fromisoformat(context.now.replace("Z", "+00:00"))

        explicit = re.search(
            r"\b(\d{4}-\d{2}-\d{2})\s*(?:to|-|and|through)\s*(\d{4}-\d{2}-\d{2})\b", text
        )
        if explicit:
            ex.claim(explicit, f"dates {explicit.group(1)}..{explicit.group(2)}")
            return TimeRange(
                start=f"{explicit.group(1)}T00:00:00Z", end=f"{explicit.group(2)}T23:59:59Z"
            )

        span = re.search(r"\bbetween\s+(\d{4})\s+and\s+(\d{4})\b", text)
        if span:
            y0, y1 = sorted((int(span.group(1)), int(span.group(2))))
            ex.claim(span, f"years {y0}..{y1}")
            return TimeRange(start=f"{y0}-01-01T00:00:00Z", end=f"{y1}-12-31T23:59:59Z")

        month = re.search(rf"\b({'|'.join(MONTHS)})\s+(\d{{4}})\b", text)
        if month:
            m, y = MONTHS[month.group(1)], int(month.group(2))
            last = calendar.monthrange(y, m)[1]
            ex.claim(month, f"month {month.group(1)} {y}")
            return TimeRange(start=f"{y}-{m:02d}-01T00:00:00Z", end=f"{y}-{m:02d}-{last}T23:59:59Z")

        since = re.search(r"\b(?:since|after|from)\s+(\d{4})\b", text)
        if since:
            y = int(since.group(1))
            ex.claim(since, f"since {y}")
            return TimeRange(start=f"{y}-01-01T00:00:00Z", end=_iso(now))

        before = re.search(r"\b(?:before|until|up to)\s+(\d{4})\b", text)
        if before:
            y = int(before.group(1))
            ex.claim(before, f"before {y}")
            return TimeRange(start="1997-01-01T00:00:00Z", end=f"{y}-01-01T00:00:00Z")

        relative = re.search(
            r"\b(?:in\s+the\s+)?(?:last|past|previous)\s+(\d+)?\s*(day|week|month|year)s?\b", text
        )
        if relative:
            count = int(relative.group(1) or 1)
            unit = relative.group(2)
            days = {"day": 1, "week": 7, "month": 30, "year": 365}[unit] * count
            ex.claim(relative, f"last {count} {unit}{'s' if count > 1 else ''}")
            return TimeRange(start=_iso(now - timedelta(days=days)), end=_iso(now))

        if match := re.search(r"\bthis year\b", text):
            ex.claim(match, f"year {now.year}")
            return TimeRange(start=f"{now.year}-01-01T00:00:00Z", end=_iso(now))
        if match := re.search(r"\blast year\b", text):
            y = now.year - 1
            ex.claim(match, f"year {y}")
            return TimeRange(start=f"{y}-01-01T00:00:00Z", end=f"{y}-12-31T23:59:59Z")

        # A bare four-digit year, but only one that is plausibly a year rather than a
        # WMO id fragment or a threshold.
        year = re.search(r"\b(?:in\s+)?((?:19|20)\d{2})\b", text)
        if year:
            y = int(year.group(1))
            if 1997 <= y <= now.year + 1:
                ex.claim(year, f"year {y}")
                return TimeRange(start=f"{y}-01-01T00:00:00Z", end=f"{y}-12-31T23:59:59Z")
        return None

    # ------------------------------------------------------------------ depth
    def _extract_depth(self, text: str, ex: _Extraction) -> DepthRange | None:
        between = re.search(
            rf"\bbetween\s+(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)\s*{DEPTH_UNITS}", text
        )
        if between:
            a, b = sorted((float(between.group(1)), float(between.group(2))))
            ex.claim(between, f"depth {a}-{b} m")
            return DepthRange(min_m=a, max_m=b)

        deeper = re.search(
            rf"\b(?:deeper than|below|under|beneath|more than)\s+(\d+(?:\.\d+)?)\s*{DEPTH_UNITS}",
            text,
        )
        if deeper:
            ex.claim(deeper, f"deeper than {deeper.group(1)} m")
            return DepthRange(min_m=float(deeper.group(1)), max_m=6000.0)

        shallower = re.search(
            rf"\b(?:shallower than|above|within|less than|top)\s+(\d+(?:\.\d+)?)\s*{DEPTH_UNITS}",
            text,
        )
        if shallower:
            ex.claim(shallower, f"shallower than {shallower.group(1)} m")
            return DepthRange(min_m=0.0, max_m=float(shallower.group(1)))

        at_depth = re.search(rf"\bat\s+(\d+(?:\.\d+)?)\s*{DEPTH_UNITS}", text)
        if at_depth:
            d = float(at_depth.group(1))
            ex.claim(at_depth, f"near {d} m")
            return DepthRange(min_m=max(0.0, d - 25), max_m=d + 25)

        if match := re.search(r"\b(?:at the surface|surface|near-surface|sea surface|sst)\b", text):
            ex.claim(match, "surface layer (0-10 m)")
            return DepthRange(min_m=0.0, max_m=10.0)
        if match := re.search(r"\b(?:thermocline|halocline)\b", text):
            ex.claim(match, "thermocline band (0-500 m)")
            return DepthRange(min_m=0.0, max_m=500.0)
        if match := re.search(r"\bdeep(?:\s+(?:water|ocean))?\b", text):
            ex.claim(match, "deep water (below 1000 m)")
            return DepthRange(min_m=1000.0, max_m=6000.0)
        return None

    # ------------------------------------------------------------- thresholds
    def _extract_thresholds(
        self, text: str, ex: _Extraction, context: ParseContext
    ) -> tuple[list[VariableFilter], list[str], DepthRange | None]:
        filters: list[VariableFilter] = []
        anomalies: list[str] = []
        implied_depth: DepthRange | None = None

        # A marine heatwave is a domain concept, not a number the user should have to
        # supply: anomalously warm water AT THE SURFACE. Expanding it to both a
        # threshold and a depth band is the single highest-value rule here.
        heatwave = re.search(r"\b(?:marine\s+)?heat\s?waves?\b", text)
        if heatwave:
            ex.claim(heatwave, "marine heatwave = surface water above 29 °C")
            filters.append(
                VariableFilter(variable="temperature_c", op=FilterOp.GT, value=29.0, value2=None)
            )
            anomalies.append("SURFACE_HEATWAVE")
            implied_depth = DepthRange(min_m=0.0, max_m=10.0)

        if match := re.search(r"\banomal(?:y|ies|ous)\b", text):
            ex.claim(match, "any flagged anomaly")
            anomalies.append("*")

        patterns: list[tuple[str, str, FilterOp, str]] = [
            (
                rf"\b(?:warmer|hotter)\s+than\s+(-?\d+(?:\.\d+)?)\s*{TEMP_UNITS}?",
                "temperature_c",
                FilterOp.GT,
                "warmer than",
            ),
            (
                rf"\b(?:colder|cooler)\s+than\s+(-?\d+(?:\.\d+)?)\s*{TEMP_UNITS}?",
                "temperature_c",
                FilterOp.LT,
                "colder than",
            ),
            (
                r"\btemperature\s+(?:above|over|exceeding|greater than)\s+(-?\d+(?:\.\d+)?)",
                "temperature_c",
                FilterOp.GT,
                "temperature above",
            ),
            (
                r"\btemperature\s+(?:below|under|less than)\s+(-?\d+(?:\.\d+)?)",
                "temperature_c",
                FilterOp.LT,
                "temperature below",
            ),
            (
                rf"\b(?:above|over|exceeding|hotter than)\s+(-?\d+(?:\.\d+)?)\s*{TEMP_UNITS}",
                "temperature_c",
                FilterOp.GT,
                "above",
            ),
            (
                rf"\b(?:below|under|colder than)\s+(-?\d+(?:\.\d+)?)\s*{TEMP_UNITS}",
                "temperature_c",
                FilterOp.LT,
                "below",
            ),
            (r"\bsaltier\s+than\s+(-?\d+(?:\.\d+)?)", "salinity_psu", FilterOp.GT, "saltier than"),
            (r"\bfresher\s+than\s+(-?\d+(?:\.\d+)?)", "salinity_psu", FilterOp.LT, "fresher than"),
            (
                r"\bsalinity\s+(?:above|over|greater than)\s+(-?\d+(?:\.\d+)?)",
                "salinity_psu",
                FilterOp.GT,
                "salinity above",
            ),
            (
                r"\bsalinity\s+(?:below|under|less than)\s+(-?\d+(?:\.\d+)?)",
                "salinity_psu",
                FilterOp.LT,
                "salinity below",
            ),
            (
                rf"\b(?:above|over)\s+(-?\d+(?:\.\d+)?)\s*{SALT_UNITS}",
                "salinity_psu",
                FilterOp.GT,
                "above",
            ),
        ]
        for pattern, variable, op, label in patterns:
            match = re.search(pattern, text)
            if not match or not context.has_variable(variable):
                continue
            if any(s <= match.start() < e for s, e in ex.spans):
                continue  # already consumed, e.g. by the depth extractor
            value = float(match.group(1))
            ex.claim(match, f"{variable} {label} {value}")
            filters.append(VariableFilter(variable=variable, op=op, value=value, value2=None))

        return filters, anomalies, implied_depth

    # -------------------------------------------------------------- ids/limit
    def _extract_wmo(self, text: str, ex: _Extraction) -> list[str] | None:
        ids = []
        for match in re.finditer(r"\b(\d{7})\b", text):
            ids.append(match.group(1))
            ex.claim(match, f"float {match.group(1)}")
        return ids or None

    def _extract_limit(self, text: str, ex: _Extraction) -> int | None:
        match = re.search(r"\b(?:top|first|limit(?:ed to)?|at most|up to)\s+(\d{1,6})\b", text)
        if match:
            ex.claim(match, f"limit {match.group(1)}")
            return max(1, min(500_000, int(match.group(1))))
        return None

    # ------------------------------------------------------------- reporting
    def _unresolved(self, text: str, ex: _Extraction) -> list[str]:
        """Report meaningful words no extractor claimed, grouped into phrases."""
        consumed = bytearray(len(text))
        for start, end in ex.spans:
            for i in range(start, min(end, len(text))):
                consumed[i] = 1

        leftovers: list[str] = []
        # The curly apostrophe in the class is deliberate: users paste text from
        # documents and phones, and a word like don't written with a typographic
        # apostrophe must tokenise as one word rather than two fragments.
        for match in re.finditer(r"[a-z][a-z'’-]+|\d+(?:\.\d+)?", text):  # noqa: RUF001
            if any(consumed[i] for i in range(match.start(), match.end())):
                continue
            word = match.group(0)
            if word in STOPWORDS or len(word) < 3:
                continue
            leftovers.append(word)

        # Collapse adjacent leftovers into phrases so the UI shows "sea ice extent"
        # rather than three separate chips.
        phrases: list[str] = []
        for word in leftovers:
            if (
                phrases
                and text.find(word) - text.find(phrases[-1].split()[-1]) <= len(phrases[-1]) + 2
            ):
                phrases[-1] = f"{phrases[-1]} {word}"
            else:
                phrases.append(word)
        return phrases[:8]

    def _confidence(self, spec: QuerySpec, unresolved: list[str], ex: _Extraction) -> float:
        constraints = sum(
            [
                spec.bbox is not None,
                spec.time_range is not None,
                spec.depth_range_m is not None,
                bool(spec.variable_filters),
                bool(spec.wmo_ids),
                bool(spec.anomaly_codes),
            ]
        )
        if constraints == 0:
            return 0.15
        score = min(0.55 + 0.12 * constraints, 0.95)
        return round(max(0.15, score - 0.08 * len(unresolved)), 2)

    def describe(self) -> dict[str, object]:
        return {
            "id": self.parser_id,
            "requires_network": False,
            "model": None,
            "cost_tier": "free",
            "supports_followup": False,
            "regions_known": len(REGIONS),
        }
