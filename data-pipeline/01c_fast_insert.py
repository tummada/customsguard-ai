"""Fast batch insert HS codes into DB using executemany + batch commit."""
import os, sys, csv, glob
sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn

INPUT_DIR = os.path.join(RAW_DIR, "hs-codes")

def parse_all_csvs():
    hs_map = {}
    csv_files = sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_09_*.csv")))
    csv_files += sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_10_*.csv")))
    csv_files += sorted(glob.glob(os.path.join(INPUT_DIR, "ctm_06_06_*.csv")))

    for filepath in csv_files:
        print(f"  Parsing {os.path.basename(filepath)}...", end=" ", flush=True)
        count = 0
        for enc in ["utf-8-sig", "utf-8", "tis-620"]:
            try:
                with open(filepath, "r", encoding=enc) as f:
                    reader = csv.reader(f)
                    header = next(reader)
                    code_col = desc_th_col = desc_en_col = unit_col = None
                    for i, h in enumerate(header):
                        h = h.strip().strip('"')
                        if "พิกัดศุลกากร" in h: code_col = i
                        elif h == "คำอธิบายไทย": desc_th_col = i
                        elif "คำอธิบาย" in h and "ไทย" not in h: desc_en_col = i
                        elif "หน่วย" in h: unit_col = i
                    if code_col is None: break
                    for row in reader:
                        if len(row) <= code_col: continue
                        digits = row[code_col].strip().strip('"').replace(" ", "")
                        if not digits or not digits.isdigit() or len(digits) < 4: continue
                        if len(digits) >= 8: code = f"{digits[:4]}.{digits[4:6]}.{digits[6:8]}"
                        elif len(digits) >= 6: code = f"{digits[:4]}.{digits[4:6]}"
                        else: code = digits[:4]
                        if code not in hs_map:
                            desc_th = row[desc_th_col].strip().strip('"') if desc_th_col and len(row) > desc_th_col else None
                            desc_en = row[desc_en_col].strip().strip('"') if desc_en_col and len(row) > desc_en_col else None
                            unit = row[unit_col].strip().strip('"') if unit_col and len(row) > unit_col else None
                            hs_map[code] = (code, int(digits[:2]), code[:7] if len(code)>=7 else None,
                                          code[:10] if len(code)>=10 else None, desc_th, desc_en, unit)
                            count += 1
                break
            except (UnicodeDecodeError, csv.Error): continue
        print(f"{count} new")
    return list(hs_map.values())

def main():
    print("Parsing CSVs...")
    rows = parse_all_csvs()
    print(f"\nTotal unique: {len(rows)}")

    conn = get_db_conn()
    conn.autocommit = False
    cur = conn.cursor()

    print("Batch inserting...", flush=True)
    batch_size = 500
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        for r in batch:
            cur.execute("""
                INSERT INTO cg_hs_codes (code, chapter, heading, subheading, description_th, description_en, unit, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (code) DO UPDATE SET
                    description_th = COALESCE(EXCLUDED.description_th, cg_hs_codes.description_th),
                    description_en = COALESCE(EXCLUDED.description_en, cg_hs_codes.description_en),
                    unit = COALESCE(EXCLUDED.unit, cg_hs_codes.unit),
                    chapter = COALESCE(EXCLUDED.chapter, cg_hs_codes.chapter),
                    heading = COALESCE(EXCLUDED.heading, cg_hs_codes.heading),
                    subheading = COALESCE(EXCLUDED.subheading, cg_hs_codes.subheading),
                    updated_at = NOW()
            """, r)
        conn.commit()
        inserted += len(batch)
        print(f"  {inserted}/{len(rows)}", flush=True)

    cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
    total = cur.fetchone()[0]
    print(f"\nDONE! Total HS codes in DB: {total}")
    conn.close()

if __name__ == "__main__":
    main()
