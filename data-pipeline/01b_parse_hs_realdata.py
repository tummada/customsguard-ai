#!/usr/bin/env python3
"""
Script 01b: Parse REAL HS Code data from data.go.th CSV files

CSV format (ctm_06_09 — import data, 11-digit HS codes):
  ปีแม่แบบ, เดือนแม่แบบ, พิกัดศุลกากร 8 หลัก, รหัสสถิติ, หน่วยตามรหัสสถิติ,
  คำอธิบายไทย, คำอธิบาย(EN), น้ำหนัก/ปริมาณสถิติ, มูลค่านำเข้าเงินบาท

We extract UNIQUE HS codes (8 digits) with Thai + English descriptions.
"""

import os
import sys
import csv
import glob

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.validator import normalize_hs_code

INPUT_DIR = os.path.join(RAW_DIR, "hs-codes")
SOURCE_URL = "https://data.go.th/en/dataset"


def parse_trade_csv(filepath: str) -> dict:
    """Parse a trade CSV and extract unique HS codes with descriptions."""
    hs_map = {}  # code -> {desc_th, desc_en, unit}

    for encoding in ["utf-8-sig", "utf-8", "tis-620", "cp874"]:
        try:
            with open(filepath, "r", encoding=encoding) as f:
                reader = csv.reader(f)
                header = next(reader)

                # Find column indexes
                code_col = None
                desc_th_col = None
                desc_en_col = None
                unit_col = None

                for i, h in enumerate(header):
                    h_clean = h.strip().strip('"').strip()
                    if "พิกัดศุลกากร" in h_clean or "พิกัด" in h_clean:
                        code_col = i
                    elif "คำอธิบายไทย" in h_clean or "คำอธิบาย" == h_clean:
                        if desc_th_col is None:
                            desc_th_col = i
                    elif "คำอธิบาย" in h_clean and "ไทย" not in h_clean:
                        desc_en_col = i
                    elif "หน่วย" in h_clean:
                        unit_col = i

                if code_col is None:
                    break

                for row in reader:
                    if len(row) <= code_col:
                        continue

                    code_raw = row[code_col].strip().strip('"').strip()
                    if not code_raw or not code_raw.replace(" ", "").isdigit():
                        continue

                    digits = code_raw.replace(" ", "").strip()
                    if len(digits) < 4:
                        continue

                    # Format as XXXX.XX.XX
                    if len(digits) >= 8:
                        code = f"{digits[:4]}.{digits[4:6]}.{digits[6:8]}"
                    elif len(digits) >= 6:
                        code = f"{digits[:4]}.{digits[4:6]}"
                    else:
                        code = digits[:4]

                    desc_th = row[desc_th_col].strip().strip('"') if desc_th_col and len(row) > desc_th_col else None
                    desc_en = row[desc_en_col].strip().strip('"') if desc_en_col and len(row) > desc_en_col else None
                    unit = row[unit_col].strip().strip('"') if unit_col and len(row) > unit_col else None

                    if code not in hs_map:
                        hs_map[code] = {
                            "code": code,
                            "description_th": desc_th,
                            "description_en": desc_en,
                            "unit": unit,
                        }
                    else:
                        # Fill in missing descriptions
                        if desc_th and not hs_map[code]["description_th"]:
                            hs_map[code]["description_th"] = desc_th
                        if desc_en and not hs_map[code]["description_en"]:
                            hs_map[code]["description_en"] = desc_en

                break  # success
        except (UnicodeDecodeError, csv.Error):
            continue

    return hs_map


def upsert_hs_codes(conn, hs_map: dict):
    """Insert or update HS codes."""
    inserted = 0
    updated = 0

    with conn.cursor() as cur:
        for code, rec in hs_map.items():
            digits = code.replace(".", "")
            chapter = int(digits[:2]) if len(digits) >= 2 else None
            heading = code[:7] if len(code) >= 7 else None
            subheading = code[:10] if len(code) >= 10 else None

            cur.execute("""
                INSERT INTO cg_hs_codes
                    (code, chapter, heading, subheading,
                     description_th, description_en, unit, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (code) DO UPDATE SET
                    description_th = COALESCE(EXCLUDED.description_th, cg_hs_codes.description_th),
                    description_en = COALESCE(EXCLUDED.description_en, cg_hs_codes.description_en),
                    unit = COALESCE(EXCLUDED.unit, cg_hs_codes.unit),
                    chapter = COALESCE(EXCLUDED.chapter, cg_hs_codes.chapter),
                    heading = COALESCE(EXCLUDED.heading, cg_hs_codes.heading),
                    subheading = COALESCE(EXCLUDED.subheading, cg_hs_codes.subheading),
                    updated_at = NOW()
            """, (
                code, chapter, heading, subheading,
                rec["description_th"], rec["description_en"], rec["unit"],
            ))
            if "INSERT" in (cur.statusmessage or ""):
                inserted += 1
            else:
                updated += 1

    conn.commit()
    return inserted, updated


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "01b_parse_hs_realdata")

    # Find all CSV files (prioritize 11-digit import/export data)
    csv_files = sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_09_*.csv")))  # import 11-digit
    csv_files += sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_10_*.csv")))  # export 11-digit
    csv_files += sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_06_*.csv")))  # export 4-digit

    print(f"Found {len(csv_files)} CSV files to parse")

    all_hs = {}
    for filepath in csv_files:
        filename = os.path.basename(filepath)
        source_key = f"realdata:{filename}"

        if tracker.is_processed(source_key):
            print(f"  Skip (done): {filename}")
            continue

        print(f"  Parsing: {filename}...", end=" ", flush=True)
        try:
            hs_map = parse_trade_csv(filepath)
            new_codes = {k: v for k, v in hs_map.items() if k not in all_hs}
            all_hs.update(hs_map)
            print(f"{len(hs_map)} codes ({len(new_codes)} new)")
            tracker.mark_processed(source_key, f"{len(hs_map)} codes, {len(new_codes)} new")
        except Exception as e:
            print(f"ERROR: {e}")
            tracker.mark_failed(source_key, str(e))

    print(f"\nTotal unique HS codes extracted: {len(all_hs)}")

    if all_hs:
        print("Inserting into DB...", end=" ", flush=True)
        inserted, updated = upsert_hs_codes(conn, all_hs)
        print(f"{inserted} inserted, {updated} updated")

    # Final count
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        total = cur.fetchone()[0]

    print(f"\nTotal HS codes in DB: {total}")
    conn.close()


if __name__ == "__main__":
    main()
