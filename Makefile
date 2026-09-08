# FloatChat task runner (POSIX / mingw32-make).
# On Windows without `make` on PATH, use the equivalent: .\make.ps1 <target>

SHELL := /bin/sh
PY    := backend/.venv/Scripts/python.exe
ifeq (,$(wildcard backend/.venv/Scripts/python.exe))
PY    := backend/.venv/bin/python
endif

.DEFAULT_GOAL := help
.PHONY: help contracts contracts-check seed test lint dev dev-backend dev-frontend

help:
	@echo "FloatChat targets:"
	@echo "  contracts        regenerate TypeScript + Pydantic types from contracts/"
	@echo "  contracts-check  regenerate and fail if anything changed (the P1 gate)"
	@echo "  seed             build sample fixtures from backend/data/raw"
	@echo "  test             pytest"
	@echo "  lint             ruff"
	@echo "  dev              run backend and frontend together"

contracts:
	@$(PY) contracts/codegen/gen_typescript.py
	@$(PY) contracts/codegen/gen_pydantic.py

# The gate: generation must be a pure function of the schema. A second run that
# produces a diff means the generator is unstable - fix the generator, not the output.
contracts-check: contracts
	@git diff --quiet -- frontend/types backend/app/schemas || \
	  (echo "ERROR: generated types are stale. Run 'make contracts' and commit." && \
	   git --no-pager diff --stat -- frontend/types backend/app/schemas && exit 1)
	@echo "contracts up to date"

seed:
	@$(PY) backend/scripts/seed_sample_data.py

test:
	@$(PY) -m pytest backend/tests -q

lint:
	@$(PY) -m ruff check backend contracts
	@$(PY) -m ruff format --check backend contracts

dev-backend:
	@$(PY) -m uvicorn app.main:app --reload --port 8000 --app-dir backend

dev-frontend:
	@cd frontend && npm run dev

dev:
	@echo "Run 'make dev-backend' and 'make dev-frontend' in two terminals."
