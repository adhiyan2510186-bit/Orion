---
name: ship
description: Verify and push FloatChat work to the public GitHub repo — run the gates, check nothing secret is staged, commit with a conventional message, and push to main. Use after completing a phase from IMPLEMENTATION_PLAN.md, finishing a working feature, or revising documentation; also when asked to commit, push, save progress, or check whether the current work is safe to publish.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# /ship — Verify, commit, push

Repo: `https://github.com/adhiyan2510186-bit/Orion` — **public**, default branch `main`.
The user has given standing authorization to commit and push. Do not ask each time; do run the
checks each time.

**Public means published.** Every push is world-readable and may be indexed by third parties even
if deleted later. The checks below are not ceremony — they are the only thing between a stray
`.env` and permanent disclosure.

## When to push

Push when one of these is true:

- A phase from `IMPLEMENTATION_PLAN.md` (P1…P9) is complete **and its gate criterion actually
  passes**
- A coherent feature or subsystem is finished and working
- A planning or documentation artifact is created or meaningfully revised
- The user asked

Do **not** push mid-refactor, with a failing build, with a broken import, or with debug scratch
files staged. A pushed commit should always leave `main` in a state that boots.

## Workflow

**1. See what actually changed.**

```
git status --short
git diff --stat HEAD
```

Read the diff if it is not obviously what you intended. Do not stage blind with `git add -A`
without looking at the result.

**2. Run the gates. Do not push red.**

```
make lint
make test
```

Skip a target only if it does not exist yet (early phases). If either fails: fix it, or stop and
tell the user plainly what is broken and that the push is being held. Never push a failing build
and describe it as done.

If the work claims to complete a plan phase, verify that phase's specific gate — e.g. P1 requires
`make contracts` twice with zero diff on the second run; P5 requires the contract suite passing
for the new provider; P6 requires the 50k-point/60fps budget. Report the real result, never an
assumed one.

**3. Security sweep before staging.** This is the step that matters most on a public repo:

```
git status --short
git diff --cached --name-only
```

Confirm none of the following are staged:

- `.env`, `*.pem`, `*.key`, `secrets.json`, any credential file
- API keys or tokens inline in source — grep the staged diff for `sk-`, `ghp_`, `api_key`,
  `password`, `Bearer ` if any config or client code changed
- `backend/data/raw/`, `*.nc`, `*.parquet` — large or non-redistributable data
- scratch files, `.ipynb_checkpoints`, editor droppings, commented-out debug blocks

`.gitignore` covers the known cases, but a file added with `-f` or a key pasted into source will
sail straight through it. If something questionable is staged, unstage it and say so.

**4. Commit.** Conventional commits, imperative mood, subject under ~65 characters:

```
feat(map): add deck.gl 3D point cloud layer
feat(providers): add netcdf provider behind DataProvider
fix(query): honour depth range when provider lacks pushdown
chore(contracts): regenerate types after extras field
docs: add architecture diagrams
```

Scopes: `contracts`, `providers`, `parsers`, `query`, `api`, `map`, `search`, `timeline`,
`inspector`, `anomalies`, `design`, `docs`, `infra`.

Add a short body only when the *why* is non-obvious. Every commit message ends with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Prefer a new commit over amending. Never use `--no-verify`; if a hook fails, fix the cause.

**5. Push and confirm.**

```
git push
git status -sb
```

**6. Report in one line** — what was pushed and the commit subject. No changelog recitals.

## Judgment calls

- **Several unrelated changes staged?** Split into separate commits with their own scopes. One
  logical change per commit keeps the history useful for the hand-off team.
- **Work is real but incomplete?** Hold. "Solid build" is the bar. If the user explicitly wants a
  checkpoint anyway, commit it and say plainly in the report that it is WIP.
- **Never force-push `main`.** It is public and shared. If history needs fixing, ask first.
- **Something already leaked?** Say so immediately. Rotate the credential first — removing it from
  history does not un-publish it.
