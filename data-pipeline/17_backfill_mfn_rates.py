#!/usr/bin/env python3
"""
Script 17: Backfill MFN (base_rate) into cg_hs_codes from scraped FTA data.

After re-running 16_scrape_fta_playwright.py (which now captures mfn_rate),
this script reads all JSON files in data/fta_scraped/ and updates
cg_hs_codes.base_rate for each HS code found.

Usage:
  python 17_backfill_mfn_rates.py [--dry-run]

Prerequisites:
  - Re-run 16_scrape_fta_playwright.py from Thai IP first
  - JSON files must contain 'mfn_rate' field (added in scraper update 2026-03-10)
"""

import os
import sys
import json
import re

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "fta_scraped")


def normalize_hs_code(raw_code: str) -> str:
    """Convert 11-digit raw HS code to dotted format for DB lookup."""
    digits = raw_code.replace(".", "").replace(" ", "")
    if len(digits) >= 8:
        return f"{digits[:4]}.{digits[4:6]}.{digits[6:8]}"
    elif len(digits) >= 4:
        return digits[:4]
    return raw_code


def parse_rate(rate_text):
    """Parse rate text to float. Returns None if not parseable."""
    if not rate_text:
        return None
    text = str(rate_text).strip().upper()
    if text in ("FREE", "0", "0%", "0.00", "-"):
        return 0.0
    match = re.match(r"^(\d+(?:\.\d+)?)\s*%?$", text)
    if match:
        return float(match.group(1))
    return None


def backfill(dry_run=False):
    """Read scraped JSONs and update base_rate in cg_hs_codes."""
    json_files = sorted(
        f for f in os.listdir(DATA_DIR)
        if f.endswith(".json") and f != "progress.json"
    )
    if not json_files:
        print("No scraped data files found. Run 16_scrape_fta_playwright.py first.")
        return

    # Collect unique HS code → MFN rate mapping
    mfn_map = {}
    files_with_mfn = 0
    files_without_mfn = 0

    for jf in json_files:
        filepath = os.path.join(DATA_DIR, jf)
        with open(filepath) as f:
            rates = json.load(f)

        has_mfn = False
        for item in rates:
            mfn_rate_raw = item.get("mfn_rate")
            if mfn_rate_raw is None:
                continue
            has_mfn = True

            hs_code = normalize_hs_code(item["hs_code"])
            mfn_rate = parse_rate(mfn_rate_raw)
            if mfn_rate is not None and hs_code not in mfn_map:
                mfn_map[hs_code] = mfn_rate

        if has_mfn:
            files_with_mfn += 1
        else:
            files_without_mfn += 1

    print(f"JSON files: {len(json_files)} ({files_with_mfn} with MFN, {files_without_mfn} without)")
    print(f"Unique HS codes with MFN rate: {len(mfn_map)}")

    if not mfn_map:
        print("\nNo MFN rates found in scraped data.")
        print("You need to re-run 16_scrape_fta_playwright.py (from Thai IP)")
        print("to capture MFN rates (scraper was updated 2026-03-10).")
        return

    if dry_run:
        print("\n[DRY RUN] Would update these rates:")
        for code, rate in sorted(mfn_map.items())[:20]:
            print(f"  {code}: {rate}%")
        if len(mfn_map) > 20:
            print(f"  ... and {len(mfn_map) - 20} more")
        return

    # Update DB
    conn = get_db_conn()
    updated = 0
    not_found = 0

    for hs_code, rate in mfn_map.items():
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE cg_hs_codes
                    SET base_rate = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE code = %s AND (base_rate IS NULL OR base_rate != %s)
                """, (rate, hs_code, rate))
                if cur.rowcount > 0:
                    updated += 1
                else:
                    not_found += 1
        except Exception as e:
            print(f"  ERROR updating {hs_code}: {e}")
            conn.rollback()

    conn.commit()

    # Verify
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE base_rate IS NOT NULL")
        total_with_rate = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        total = cur.fetchone()[0]

    print(f"\nUpdated: {updated}")
    print(f"Not found / unchanged: {not_found}")
    print(f"HS codes with base_rate: {total_with_rate}/{total} ({100*total_with_rate//total}%)")
    conn.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    backfill(dry_run=dry)
