"""Parser registry. Concrete modules imported so their decorators run."""

from app.parsers import rule_parser  # noqa: F401
from app.parsers.base import NLPParser, ParseContext
from app.parsers.registry import available_parsers, create_parser, register_parser

__all__ = ["NLPParser", "ParseContext", "available_parsers", "create_parser", "register_parser"]
