#!/usr/bin/env python3
"""
Phase A Master Script: Collect all RAW data into data/raw/

This downloads data from all sources WITHOUT using any AI.
No GCP credits are consumed. Run this first to build the data lake.

After this completes, all raw files are in data/raw/ and
can be processed by Phase B scripts (01-14).
"""

import os
import sys
import traceback
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR

# Import all collectors — Tier 1 (Core Data)
from collectors.opendata_hs_codes import collect as collect_opendata
from collectors.customs_pdfs import collect as collect_customs
from collectors.ecs_regulations import collect as collect_ecs
from collectors.ntr_fta_rates import collect as collect_ntr
from collectors.dtn_fta_rates import collect as collect_dtn

# Tier 2 (Expert-level Data)
from collectors.cbp_cross_rulings import collect as collect_cbp
from collectors.antidumping_dft import collect as collect_ad
from collectors.excise_tax import collect as collect_excise
from collectors.boi_privileges import collect as collect_boi
from collectors.nsw_lpi_controls import collect as collect_lpi


def main():
    os.makedirs(RAW_DIR, exist_ok=True)

    collectors = [
        # Tier 1: Core Data
        ("1. data.go.th HS Codes (CSV/XLSX)", collect_opendata),
        ("2. customs.go.th PDFs (Rulings/Laws)", collect_customs),
        ("3. ecs-support.github.io (Regulations)", collect_ecs),
        ("4. thailandntr.com FTA Rates", collect_ntr),
        ("5. tax.dtn.go.th FTA Comparison", collect_dtn),
        # Tier 2: Expert-level Data
        ("6. US CBP CROSS Rulings (Free API)", collect_cbp),
        ("7. Anti-Dumping/CVD (dft.go.th)", collect_ad),
        ("8. Excise Tax (excise.go.th)", collect_excise),
        ("9. BOI Privileges (boi.go.th)", collect_boi),
        ("10. NSW/LPI Controls (Permits/Licenses)", collect_lpi),
    ]

    results = {}
    for name, collector_fn in collectors:
        print(f"\n{'='*60}")
        print(f"  {name}")
        print(f"{'='*60}")
        try:
            result = collector_fn()
            results[name] = {"status": "OK", "result": str(result)}
            print(f"\n  ✓ {name} — OK")
        except Exception as e:
            results[name] = {"status": "ERROR", "error": str(e)}
            print(f"\n  ✗ {name} — ERROR: {e}")
            traceback.print_exc()

    # Summary
    print(f"\n{'='*60}")
    print("  SUMMARY")
    print(f"{'='*60}")
    for name, info in results.items():
        status = info["status"]
        print(f"  [{status}] {name}")

    # Save run log
    log_path = os.path.join(RAW_DIR, "_collection_log.txt")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n--- Run: {datetime.now().isoformat()} ---\n")
        for name, info in results.items():
            f.write(f"  [{info['status']}] {name}\n")
            if info["status"] == "ERROR":
                f.write(f"    Error: {info['error']}\n")

    ok_count = sum(1 for v in results.values() if v["status"] == "OK")
    print(f"\nCompleted: {ok_count}/{len(collectors)} collectors succeeded")
    print(f"Raw data directory: {RAW_DIR}")


if __name__ == "__main__":
    main()
