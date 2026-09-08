# ADR 0002 - Ship without an LLM parser

**Status:** accepted · 2026-09-09
**Affects:** `IMPLEMENTATION_PLAN.md` P8

## Context

The natural-language query engine is a headline deliverable. Two implementations were
planned behind the `NLPParser` interface: a deterministic `rule` parser and an `llm`
parser using tool calling.

No API key was available for this build, and the user chose to proceed without one.
The choice was therefore between writing the LLM path anyway and never executing it,
or spending that effort on the rule parser.

## Decision

Build only the `rule` parser, and build it to carry the demo alone: a 25-region ocean
gazetteer, relative and absolute dates, unit-aware threshold disambiguation, depth
bands, float ids, and domain concepts like "marine heatwave" that expand to a threshold
*and* a depth band.

`llm_parser.py` is **not** written. The interface, the registry and the golden test set
are all in place, so adding one later is EP-2 in the extension guide.

## Consequences

- The demo has no network dependency, no cost per query, and cannot fail because a
  vendor is slow or down. For a live demonstration that is worth more than breadth.
- Coverage is bounded by phrasings that were anticipated. This is mitigated by making
  the limitation *visible*: `ParseResult.unresolved` reports every phrase the parser
  could not map, and the UI renders those as chips. A confident wrong answer is worse
  than an admitted gap.
- Untested code was not shipped. Writing an LLM path that never ran would have produced
  a headline feature nobody could vouch for.
- The rule parser is **not** a placeholder. Even once an LLM parser exists it remains
  the fallback in the chain, because a deterministic offline parser is the thing that
  keeps the product answering when the model is unavailable.
