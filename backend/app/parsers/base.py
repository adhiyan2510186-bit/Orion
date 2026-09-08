"""The NLPParser interface.

A parser has exactly one job: turn a plain-English string into a valid `QuerySpec`.
It never touches data, never knows which provider is loaded, and never runs a filter.
`QuerySpec` is the seam - that is why the parser and the storage engine can be
replaced independently.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.schemas.argo import ParseResult, ProviderMetadata, VariableDescriptor


@dataclass(frozen=True)
class ParseContext:
    """What the parser is allowed to know about the loaded dataset.

    Passing the provider's real bounds in is what stops a parser inventing a variable
    the data does not have, and lets a query outside the dataset's time range fail at
    parse time with a useful message instead of silently returning zero rows.
    """

    metadata: ProviderMetadata
    now: str
    anomaly_codes: list[str] = field(default_factory=list)

    @property
    def variables(self) -> list[VariableDescriptor]:
        return self.metadata.variables

    def has_variable(self, key: str) -> bool:
        return any(v.key == key for v in self.metadata.variables)


class NLPParser(ABC):
    """Translates natural language into a structured QuerySpec."""

    #: Registry key. Set by @register_parser.
    parser_id: str = "abstract"

    @abstractmethod
    async def parse(self, query: str, context: ParseContext) -> ParseResult:
        """Return a spec plus an honest account of what was and was not understood.

        `unresolved` is first-class output, not an afterthought: a parser that silently
        drops half the query and reports high confidence is worse than one that admits
        the gap, because the user gets a confident wrong answer instead of a question.
        """

    def describe(self) -> dict[str, object]:
        """Registry metadata. Overridden by parsers with cost or network implications."""
        return {
            "id": self.parser_id,
            "requires_network": False,
            "model": None,
            "cost_tier": "free",
            "supports_followup": False,
        }
