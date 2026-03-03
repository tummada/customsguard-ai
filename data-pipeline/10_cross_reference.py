#!/usr/bin/env python3
"""
Script 10: Cross-reference regulations ↔ HS codes

Uses Gemini Flash to analyze regulations and extract related HS codes.
Updates cg_regulations.related_hs_codes array.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.gcp_vertex_client import generate_structured
from utils.structured_schemas import CROSS_REFERENCE_SCHEMA
from utils.validator import validate_hs_code, normalize_hs_code
from tqdm import tqdm

CROSS_REF_PROMPT = """คุณเป็นผู้เชี่ยวชาญพิกัดศุลกากรไทย อ่านเอกสารด้านล่าง
แล้วระบุ HS codes ที่เกี่ยวข้อง:

เอกสาร: {doc_type} — {title}
เนื้อหา:
{content}

---
ระบุ:
1. related_hs_codes: รหัส HS ทั้งหมดที่พบหรือเกี่ยวข้อง (format: XXXX.XX.XX)
2. related_fta_names: ชื่อ FTA ที่กล่าวถึง (เช่น ATIGA, RCEP)

ระบุเฉพาะที่พบในเนื้อหา ห้ามเดา"""


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "10_cross_reference")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT id::text, doc_type, title, content
            FROM cg_regulations
            WHERE (related_hs_codes IS NULL OR array_length(related_hs_codes, 1) IS NULL)
            AND content IS NOT NULL
            AND LENGTH(content) > 100
            ORDER BY created_at
        """)
        regulations = cur.fetchall()

    print(f"Regulations to cross-reference: {len(regulations)}")

    updated = 0
    for reg_id, doc_type, title, content in tqdm(regulations, desc="Cross-referencing"):
        source_key = f"xref:{reg_id}"

        if tracker.is_processed(source_key):
            continue

        try:
            truncated = content[:6000] if len(content) > 6000 else content
            prompt = CROSS_REF_PROMPT.format(
                doc_type=doc_type or "REGULATION",
                title=title or "Untitled",
                content=truncated,
            )

            result_text = generate_structured(prompt, response_schema=CROSS_REFERENCE_SCHEMA)
            result = json.loads(result_text)

            hs_codes = result.get("related_hs_codes", [])
            fta_names = result.get("related_fta_names", [])

            # Validate and normalize HS codes
            valid_codes = []
            for code in hs_codes:
                valid, _ = validate_hs_code(code)
                if valid:
                    valid_codes.append(normalize_hs_code(code))

            if valid_codes:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE cg_regulations
                        SET related_hs_codes = %s,
                            tags = COALESCE(tags, '{}') || %s,
                            updated_at = NOW()
                        WHERE id = %s::uuid
                    """, (
                        valid_codes,
                        fta_names,
                        reg_id,
                    ))
                conn.commit()
                updated += 1

            tracker.mark_processed(source_key, f"hs={len(valid_codes)}, fta={len(fta_names)}")

        except Exception as e:
            print(f"\n  Error cross-referencing {reg_id}: {e}")
            tracker.mark_failed(source_key, str(e))
            conn.rollback()

    print(f"\n{'='*40}")
    print(f"Updated: {updated} regulations with HS code references")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
