# CLAUDE.md

Operating instructions for Claude Code in this repository.

## Project

**FloatChat** — a natural-language query engine + 4D WebGL visualization platform for ARGO
oceanographic float data. Python/FastAPI backend, Next.js/deck.gl frontend, monorepo.

| Document | Read it when |
|---|---|
| `PROGRESS.md` | **First, every session.** Locked decisions, verified environment facts, real-data gotchas, phase status, and the exact next action. Resume from here. |
| `PROJECT_CONTEXT.md` | You need the domain problem statement and deliverable criteria. **Authoritative on requirements.** |
| `IMPLEMENTATION_PLAN.md` | Before writing any code. **Authoritative on architecture, folder layout, schemas, and phase order.** |
| `docs/adr/` | You are about to contradict an architectural decision. Add an ADR rather than silently diverging. |
| `docs/extension-guide.md` | You are adding a provider, parser, layer, theme, or detector. |

If a request conflicts with `IMPLEMENTATION_PLAN.md`, say so and ask — do not quietly redesign.

## Project skills

Repeatable workflows live in `.claude/skills/`. Invoke the matching one instead of improvising —
each encodes the extension-point recipe plus the gate that must pass.

| Skill | Use for |
|---|---|
| `/sync-contracts` | Any change to a wire type. Edits the JSON Schema, regenerates both languages, records the change. |
| `/add-provider` | New or swapped data source (NetCDF, Parquet, GDAC, PostGIS, vector DB). EP-1. |
| `/add-parser` | New or swapped NL query parser (rule, LLM tool-calling, hybrid, local). EP-2. |
| `/add-layer` | New deck.gl layer, GLSL shader, or colormap. EP-3. |
| `/ship` | Verify gates, security-sweep the diff, commit, push. |

**Design work uses `/design-md-planner`** (user-level skill), not `ui-ux-design-enhancer` — the
user has chosen it explicitly. It authors `DESIGN.md` at the repo root: YAML design tokens plus
the *argument* for each value, audited with `npx -y -p "@google/design.md" designmd lint`.

`DESIGN.md` is the upstream of `frontend/design/tokens.ts` — the prose holds the reasoning, the
generated tokens hold the values. Run it **before P6**, since the temperature and salinity
colormaps are design decisions that get expensive to change once deck.gl layers depend on them.

Node is installed portably at `%LOCALAPPDATA%\Programs\nodejs`. Run `npx` from PowerShell, not
Git Bash — the npx shim spawns `cmd.exe` and needs the Windows-form PATH.

## Non-negotiable architecture rules

These exist so future teammates can swap subsystems without refactoring. Violating them defeats
the entire point of the build.

1. **`contracts/*.schema.json` is the single source of truth for types.**
   `frontend/types/argo.ts` and `backend/app/schemas/argo.py` are **generated**. Never hand-edit
   them. Change the JSON Schema, run `make contracts`, commit the regenerated output, and record
   the change in `contracts/CHANGELOG.md`.

2. **Wire format is `snake_case` in both languages.** No camelCase translation layer.
   Timestamps are ISO-8601 UTC with `Z`. Depth is positive metres downward (`depth_m`).
   Missing values are `null` — never `-999`, `NaN`, or `9999`.

3. **Registries, not conditionals.** Data providers, NLP parsers, anomaly detectors, and deck.gl
   layer factories are all resolved from a registry by string key from config. If you find
   yourself writing `if provider == "csv"` outside a registry module, stop.

4. **One-directional layering.**
   - Backend: `api/` → `services/` → `providers/`. Never skip, never reverse. Routes must not
     import providers.
   - Frontend: `components` → `hooks` → `lib/api` → `transport`. **No React component may call
     `fetch`.** All network access goes through `lib/api/client.ts`.

5. **No hardcoded colors, spacing, or type sizes in components.** Everything comes from
   `frontend/design/tokens.ts`, which also feeds `tailwind.config.ts`. Re-theming must require
   zero component edits.

6. **Features are isolated.** A file in `features/map/` may import from another feature only via
   that feature's `index.ts`. No reaching into internals.

7. **New providers/parsers must pass the shared contract suite** in `backend/tests/contract/`
   before being wired in. That suite is what makes a swap safe.

8. **Normalization lives in providers.** Unit conversion, longitude wrapping, QC-flag scrubbing,
   and sentinel removal happen at ingestion — never downstream in services or the UI.

## Commands

Run from repo root. (Windows: PowerShell is primary; a Bash tool is also available.)

```
make dev            # backend (uvicorn :8000) + frontend (next :3000)
make contracts      # regenerate TS + Pydantic types from contracts/  — MUST be clean in CI
make test           # pytest + vitest
make lint           # ruff + mypy + eslint + import-linter boundary checks
make seed           # load sample ARGO data into backend/data/samples
```

Config switches live in `.env` (documented in `.env.example`):
`DATA_PROVIDER`, `NLP_PARSER`, `PARSER_FALLBACK_CHAIN`, `ANOMALY_DETECTORS`,
`NEXT_PUBLIC_TRANSPORT`, `THEME`.

Frontend runs standalone with `NEXT_PUBLIC_TRANSPORT=mock` and the backend stopped. Use this.

## Git & auto-push protocol

Repo: `https://github.com/adhiyan2510186-bit/Orion` (public). Default branch `main`.

**The user has standing authorization to commit and push automatically.** Do not ask each time.

Push when — and only when — one of these is true:

- A **phase from `IMPLEMENTATION_PLAN.md` is complete** (P1…P9) and its gate criterion passes.
- A **coherent feature or subsystem** is finished and working.
- A **planning or documentation artifact** is created or meaningfully revised.
- The user explicitly asks.

Do **not** push mid-refactor, with a failing build, with a broken import, or with debug scratch
files staged. A pushed commit should always leave `main` in a state that boots.

Before every push:

1. `make lint && make test` if either target exists yet — do not push red. If something fails,
   fix it or say plainly what is broken and hold the push.
2. `git status` — confirm nothing secret or generated-but-ignored is staged. Never commit `.env`,
   API keys, or `backend/data/raw/`.
3. Commit with a short conventional message, then `git push`.

**Commit message format** — conventional commits, imperative, under ~65 chars:

```
feat(map): add deck.gl 3D point cloud layer
feat(providers): add netcdf provider behind DataProvider
fix(query): honour depth range when provider lacks pushdown
docs: add implementation plan and architecture diagrams
chore(contracts): regenerate types after extras field
```

Scopes: `contracts`, `providers`, `parsers`, `query`, `api`, `map`, `search`, `timeline`,
`inspector`, `anomalies`, `design`, `docs`, `infra`.

Every commit message ends with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

After pushing, tell the user in one line what was pushed and the commit subject. Keep it brief —
no changelog recitals.

**This repo is public.** Anything committed is world-readable and may be indexed even if deleted
later. Treat every push as publication: no credentials, no personal data, no unreleased dataset
dumps.

## Working style here

- Phase order in `IMPLEMENTATION_PLAN.md` is deliberate: contracts freeze first (P1), then
  backend skeleton, then implementations. Do not start UI work that depends on unfrozen types.
- Prefer adding a file over editing a consumer. If a change requires touching many call sites,
  the abstraction is probably in the wrong place — flag it.
- Sample ARGO fixtures in `backend/data/samples/` stay small and committed so the repo clones and
  runs offline.
- When a phase gate fails, report the actual failure output. Do not describe a phase as complete
  when its gate has not passed.
