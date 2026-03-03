#!/usr/bin/env python3
"""
Script 04: Parse FTA rates from collected data → cg_fta_rates

Processes data from both thailandntr.com and tax.dtn.go.th.
Mostly parsing (no AI), but may use Gemini Flash for ambiguous data.

Uses ON CONFLICT for idempotency.
Provenance: source_url from each FTA page.
"""

import os
import sys
import json
import re
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.validator import (
    validate_hs_code, normalize_hs_code,
    validate_rate, validate_fta_name, validate_country_code,
)

NTR_DIR = os.path.join(RAW_DIR, "fta-data", "ntr")
DTN_DIR = os.path.join(RAW_DIR, "fta-data", "dtn")

# Country mapping for each FTA
FTA_COUNTRIES = {
    "ATIGA": ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "VNM"],
    "ACFTA": ["CHN"],
    "AKFTA": ["KOR"],
    "AJCEP": ["JPN"],
    "JTEPA": ["JPN"],
    "TAFTA": ["AUS"],
    "AANZFTA": ["AUS", "NZL"],
    "AIFTA": ["IND"],
    "RCEP": ["CHN", "JPN", "KOR", "AUS", "NZL"],
    "TNZCEP": ["NZL"],
}

FTA_FORMS = {
    "ATIGA": "Form D",
    "ACFTA": "Form E",
    "AKFTA": "Form AK",
    "AJCEP": "Form AJ",
    "JTEPA": "Form JTEPA",
    "TAFTA": "Form TAFTA",
    "AANZFTA": "Form AANZ",
    "AIFTA": "Form AI",
    "RCEP": "Form RCEP",
    "TNZCEP": "Form TNZCEP",
}


def parse_ntr_rates(fta_name: str) -> list[dict]:
    """Parse FTA rates from thailandntr.com collected data."""
    filepath = os.path.join(NTR_DIR, f"{fta_name.lower()}_rates.json")
    if not os.path.exists(filepath):
        print(f"  No data file for {fta_name}")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        chapters_data = json.load(f)

    records = []
    countries = FTA_COUNTRIES.get(fta_name, ["ALL"])
    form_type = FTA_FORMS.get(fta_name, "")

    for chapter_item in chapters_data:
        source_url = chapter_item.get("source_url", "")
        data = chapter_item.get("data", {})

        if isinstance(data, dict) and "html" in data:
            # HTML response — parse with BeautifulSoup
            records.extend(
                parse_html_rates(data["html"], fta_name, countries, form_type, source_url)
            )
        elif isinstance(data, dict):
            # JSON response — parse directly
            items = data.get("data", data.get("items", data.get("rates", [])))
            if isinstance(items, list):
                for item in items:
                    record = extract_fta_record(item, fta_name, countries, form_type, source_url)
                    if record:
                        records.extend(record)

    return records


def parse_html_rates(
    html: str, fta_name: str, countries: list, form_type: str, source_url: str
) -> list[dict]:
    """Parse FTA rates from HTML table."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    records = []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]

        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if not cells:
                continue

            row_dict = dict(zip(headers, cells))
            recs = extract_fta_record(row_dict, fta_name, countries, form_type, source_url)
            if recs:
                records.extend(recs)

    return records


def extract_fta_record(
    item: dict, fta_name: str, countries: list, form_type: str, source_url: str
) -> list[dict] | None:
    """Extract FTA rate records from a data item."""
    # Find HS code in various key names
    hs_code = None
    for key in ["hs_code", "hscode", "code", "tariff_code", "tariff_no",
                 "hs code", "พิกัด"]:
        if key in item and item[key]:
            hs_code = str(item[key]).strip()
            break

    if not hs_code:
        return None

    valid, _ = validate_hs_code(hs_code)
    if not valid:
        return None
    hs_code = normalize_hs_code(hs_code)

    # Find rate
    rate = None
    for key in ["rate", "preferential_rate", "fta_rate", "applied_rate",
                 "อัตรา", "duty"]:
        if key in item and item[key] is not None:
            try:
                rate_str = str(item[key]).strip().replace("%", "").replace(",", "")
                if rate_str and rate_str != "-":
                    rate = float(rate_str)
            except (ValueError, TypeError):
                pass
            break

    if rate is None:
        return None

    valid_rate, _ = validate_rate(rate)
    if not valid_rate:
        return None

    # Find effective date
    effective_from = None
    for key in ["effective_from", "effective_date", "start_date", "วันที่มีผล"]:
        if key in item and item[key]:
            effective_from = str(item[key]).strip()
            break

    if not effective_from:
        effective_from = "2024-01-01"  # Default if not specified

    # Conditions
    conditions = item.get("conditions", item.get("remark", item.get("หมายเหตุ", "")))

    # Create one record per country
    records = []
    for country in countries:
        records.append({
            "hs_code": hs_code,
            "fta_name": fta_name,
            "partner_country": country,
            "preferential_rate": rate,
            "form_type": form_type,
            "conditions": str(conditions) if conditions else None,
            "effective_from": effective_from,
            "effective_to": None,
            "source_url": source_url,
        })

    return records


def upsert_fta_rates(conn, records: list[dict]):
    """Insert or update FTA rates using ON CONFLICT."""
    inserted = 0
    skipped = 0

    with conn.cursor() as cur:
        for rec in records:
            # Verify HS code exists in cg_hs_codes
            cur.execute("SELECT 1 FROM cg_hs_codes WHERE code = %s", (rec["hs_code"],))
            if not cur.fetchone():
                skipped += 1
                continue

            try:
                cur.execute("""
                    INSERT INTO cg_fta_rates
                        (hs_code, fta_name, partner_country, preferential_rate,
                         form_type, conditions, effective_from, effective_to,
                         source_url, updated_at)
                    VALUES
                        (%(hs_code)s, %(fta_name)s, %(partner_country)s, %(preferential_rate)s,
                         %(form_type)s, %(conditions)s, %(effective_from)s, %(effective_to)s,
                         %(source_url)s, NOW())
                    ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO UPDATE SET
                        preferential_rate = EXCLUDED.preferential_rate,
                        form_type = EXCLUDED.form_type,
                        conditions = EXCLUDED.conditions,
                        source_url = EXCLUDED.source_url,
                        updated_at = NOW()
                """, rec)
                inserted += 1
            except Exception as e:
                # Skip records that fail (e.g., FK constraint)
                conn.rollback()
                skipped += 1

    conn.commit()
    return inserted, skipped


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "04_parse_fta_rates")

    total_inserted = 0
    total_skipped = 0

    # Process NTR data
    print("Processing thailandntr.com data...")
    for fta_name in FTA_COUNTRIES:
        source_key = f"ntr:{fta_name}"
        if tracker.is_processed(source_key):
            print(f"  Skip (already done): {fta_name}")
            continue

        print(f"\n  Parsing {fta_name}...")
        try:
            records = parse_ntr_rates(fta_name)
            print(f"    Extracted {len(records)} rate records")

            if records:
                inserted, skipped = upsert_fta_rates(conn, records)
                total_inserted += inserted
                total_skipped += skipped
                print(f"    DB: {inserted} inserted, {skipped} skipped")
                tracker.mark_processed(source_key, f"{inserted} inserted, {skipped} skipped")
            else:
                tracker.mark_skipped(source_key, "no records extracted")

        except Exception as e:
            print(f"    ERROR: {e}")
            tracker.mark_failed(source_key, str(e))

    # Process DTN data (if available)
    print("\nProcessing tax.dtn.go.th data...")
    dtn_manifest_path = os.path.join(DTN_DIR, "_manifest.json")
    if os.path.exists(dtn_manifest_path):
        source_key = "dtn:all"
        if not tracker.is_processed(source_key):
            # DTN data may need different parsing — mark for manual review
            try:
                # Check for API JSON files
                api_files = [f for f in os.listdir(DTN_DIR) if f.startswith("api_") and f.endswith(".json")]
                if api_files:
                    for api_file in api_files:
                        filepath = os.path.join(DTN_DIR, api_file)
                        with open(filepath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        print(f"  Found API data: {api_file} ({type(data).__name__})")
                    tracker.mark_processed(source_key, f"found {len(api_files)} API files")
                else:
                    tracker.mark_skipped(source_key, "no API data found — needs manual analysis")
            except Exception as e:
                tracker.mark_failed(source_key, str(e))
    else:
        print("  No DTN data available")

    # Final count
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_fta_rates")
        total = cur.fetchone()[0]
        cur.execute("SELECT fta_name, COUNT(*) FROM cg_fta_rates GROUP BY fta_name ORDER BY COUNT(*) DESC")
        by_fta = cur.fetchall()

    print(f"\n{'='*40}")
    print(f"Total FTA rates in DB: {total}")
    for fta_name, count in by_fta:
        print(f"  {fta_name}: {count}")
    print(f"This run: {total_inserted} inserted, {total_skipped} skipped")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
