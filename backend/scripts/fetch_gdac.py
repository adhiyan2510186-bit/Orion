r"""Download real ARGO profile files from the Ifremer GDAC.

Writes to backend/data/raw/, which is gitignored - these are large and reproducible.
The committed fixture is built from them by scripts/seed_sample_data.py.

Run with:  .\make.ps1 fetch-data
"""

from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
RAW = BACKEND / "data" / "raw"
BASE = "https://data-argo.ifremer.fr/dac"

# Selected by scanning ar_index_global_prof.txt.gz (3.4 M profiles) for the Nino 3.4
# box - 5S-5N, 170W-120W - and ranking by profile count since 2023. This is where
# equatorial Pacific marine heatwaves actually show up, which is why the demo query
# returns real hot water rather than an empty result.
FLOATS: list[tuple[str, str]] = [
    ("aoml", "5906747"),
    ("aoml", "5905768"),
    ("aoml", "5906014"),
    ("aoml", "5905669"),
    ("aoml", "5905315"),
    ("aoml", "5906085"),
    ("aoml", "5906548"),
    ("aoml", "5906473"),
    ("aoml", "3902368"),
    ("aoml", "3902370"),
    ("aoml", "5906050"),
    ("aoml", "3902367"),
    ("aoml", "5906822"),
    ("aoml", "5906236"),
]


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    total = failed = 0
    for dac, wmo in FLOATS:
        destination = RAW / f"{wmo}_prof.nc"
        if destination.exists():
            print(f"  {wmo}  cached")
            total += destination.stat().st_size
            continue
        url = f"{BASE}/{dac}/{wmo}/{wmo}_prof.nc"
        try:
            urllib.request.urlretrieve(url, destination)
            size = destination.stat().st_size
            total += size
            print(f"  {wmo}  {size / 1e6:6.2f} MB")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            # GDAC occasionally times out on individual files. One miss is survivable;
            # report it rather than aborting the whole fetch.
            failed += 1
            destination.unlink(missing_ok=True)
            print(f"  {wmo}  FAILED ({error})", file=sys.stderr)

    count = len(list(RAW.glob("*.nc")))
    print(f"\n{count} files, {total / 1e6:.1f} MB in {RAW}")
    if failed:
        print(f"{failed} download(s) failed; re-run to retry just those.", file=sys.stderr)
    print(r"Next: .\make.ps1 seed")
    return 1 if count == 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
