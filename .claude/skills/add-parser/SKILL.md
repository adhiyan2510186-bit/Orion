---
name: add-parser
description: Add or swap the FloatChat natural-language query parser behind the NLPParser interface — rule-based, Anthropic/OpenAI tool calling, hybrid, or a local Ollama model — without touching the data layer or API routes. Use when improving how plain-English queries become filters, adding or changing an LLM, tuning prompts, debugging a misparsed query, or when queries return the wrong region, depth, or date range.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# /add-parser — Swap the NLP engine (EP-2)

Every parser does exactly one job: turn a plain-English string into a valid `QuerySpec`. It never
touches data, never knows which provider is loaded, and never runs a filter. `QuerySpec` is the
seam — that is why an LLM parser and a Pandas provider can be replaced independently.

Read `backend/app/parsers/base.py` first. If it is missing, phase P3 has not run.

## Workflow

**1. Create `backend/app/parsers/<name>_parser.py`**, subclass `NLPParser`, implement:

- `parse(query, context) -> ParseResult` returning `{ spec, confidence, rationale, unresolved[] }`
- `describe() -> ParserMetadata` — `{ id, requires_network, model?, cost_tier, supports_followup }`

**2. Use `ParseContext` — do not ignore it.** It carries the live provider's `describe()`: the
available variables, the spatial bounds, and the real date range of the loaded dataset.

This is what stops an LLM inventing a variable the provider does not have, and what lets a query
outside the dataset's time range fail at parse time with a useful message instead of silently
returning zero rows. For an LLM parser, inject these bounds into the prompt.

**3. Populate `unresolved[]` honestly.** Any phrase you could not map goes here — the UI renders
these as clarification chips ("I ignored *'last summer'* — pick a date range?"). A parser that
silently drops half the query and reports `confidence: 0.95` is worse than one that admits the
gap, because the user gets a confident wrong answer.

Set `confidence` to something meaningful; the `hybrid` and chain parsers route on it.

**4. For LLM parsers, pass `QuerySpec`'s JSON Schema as the tool definition.** Do not ask for free
-form JSON and parse it. Tool/function calling with the schema attached makes the output
structurally valid by construction, which removes an entire class of failure.

- Prompts live versioned in `backend/app/parsers/prompts/` — never inline in Python
- Set a timeout. An LLM hanging must not hang the request
- Never log the API key; read it from settings, never hardcode
- Model IDs: check the current Claude model list rather than guessing from memory

**5. Register and chain.** `@register_parser("<name>")`, then set `NLP_PARSER=<name>`.

**Keep `rule` in `PARSER_FALLBACK_CHAIN`.** `ChainParser` falls back on timeout, error, or low
confidence, so a vendor outage degrades quality instead of returning 500s. The rule parser is
permanent infrastructure, not a throwaway v0 — do not delete it when the LLM lands.

**6. Evaluate before promoting — this is the gate.**

```
pytest backend/tests/contract/test_parsers.py -k <name> -v
```

The golden set maps queries to expected `QuerySpec`s. Run the new parser against the **same** set
the rule parser passes. Cover at minimum: named regions ("near the equator", "North Atlantic"),
relative dates, threshold phrasing ("warmer than 29", "marine heatwaves"), depth ranges, WMO ids,
and a deliberately ambiguous query that *should* produce `unresolved` entries.

For a real comparison, use the `parser` override field on `QueryRequest` to run both against live
traffic side by side. `QueryResponse.meta.parser` reports which one actually answered.

**7. Ship.** `make lint && make test`, commit with scope `parsers`:
`feat(parsers): add llm parser with QuerySpec tool calling`.

## Notes

- **Cost and latency:** prefer the `hybrid` parser — rules first, escalate to the LLM only when
  confidence is low. Most real queries are formulaic and never need a model call.
- **Determinism:** the rule parser must stay dependency-free and offline so tests and demos never
  depend on a network.
- **Do not let parsers filter data.** If you are tempted to reach for a DataFrame inside a parser,
  the logic belongs in `services/query_engine.py`.
- **Emit only what the spec supports.** If a query needs an operation `QuerySpec` cannot express,
  that is a `/sync-contracts` change, not a special case smuggled into one parser.
