<#
    Windows task runner for FloatChat. Mirrors the Makefile targets.

    `make` is not on PATH on this machine (only mingw32-make), and Node lives in a
    portable install that is not inherited by every shell, so this script prepends
    it. Use:  .\make.ps1 contracts
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'contracts', 'contracts-check', 'seed', 'test', 'lint',
                 'dev-backend', 'dev-frontend', 'fetch-data')]
    [string]$Target = 'help'
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Py = Join-Path $Root 'backend\.venv\Scripts\python.exe'
$env:Path = "$env:Path;$env:LOCALAPPDATA\Programs\nodejs"

if (-not (Test-Path $Py)) {
    Write-Error "Backend venv missing. Create it with:  py -3.14 -m venv backend\.venv"
}

function Invoke-Step($Description, [scriptblock]$Body) {
    Write-Host "-> $Description" -ForegroundColor Cyan
    & $Body
    if ($LASTEXITCODE -ne 0) { throw "$Description failed (exit $LASTEXITCODE)" }
}

switch ($Target) {
    'help' {
        Write-Host "FloatChat targets:`n"
        Write-Host "  contracts        regenerate TypeScript + Pydantic types from contracts/"
        Write-Host "  contracts-check  regenerate and fail if anything changed (the P1 gate)"
        Write-Host "  fetch-data       download real ARGO floats into backend/data/raw"
        Write-Host "  seed             build sample fixtures from backend/data/raw"
        Write-Host "  test             pytest"
        Write-Host "  lint             ruff check + format --check"
        Write-Host "  dev-backend      uvicorn on :8000"
        Write-Host "  dev-frontend     next dev on :3000"
    }
    'contracts' {
        Invoke-Step 'generating TypeScript' { & $Py "$Root\contracts\codegen\gen_typescript.py" }
        Invoke-Step 'generating Pydantic'   { & $Py "$Root\contracts\codegen\gen_pydantic.py" }
    }
    'contracts-check' {
        & $Py "$Root\contracts\codegen\gen_typescript.py"
        & $Py "$Root\contracts\codegen\gen_pydantic.py"
        git -C $Root diff --quiet -- frontend/types backend/app/schemas
        if ($LASTEXITCODE -ne 0) {
            git -C $Root --no-pager diff --stat -- frontend/types backend/app/schemas
            throw "Generated types are stale. Run '.\make.ps1 contracts' and commit the result."
        }
        Write-Host 'contracts up to date' -ForegroundColor Green
    }
    'fetch-data'   { Invoke-Step 'fetching ARGO data' { & $Py "$Root\backend\scripts\fetch_gdac.py" } }
    'seed'         { Invoke-Step 'seeding fixtures'   { & $Py "$Root\backend\scripts\seed_sample_data.py" } }
    'test'         { Invoke-Step 'pytest'             { & $Py -m pytest "$Root\backend\tests" -q } }
    'lint' {
        Invoke-Step 'ruff check'  { & $Py -m ruff check "$Root\backend" "$Root\contracts" }
        Invoke-Step 'ruff format' { & $Py -m ruff format --check "$Root\backend" "$Root\contracts" }
    }
    'dev-backend'  { & $Py -m uvicorn app.main:app --reload --port 8000 --app-dir "$Root\backend" }
    'dev-frontend' { Push-Location "$Root\frontend"; try { npm run dev } finally { Pop-Location } }
}
