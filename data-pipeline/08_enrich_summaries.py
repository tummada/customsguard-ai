#!/usr/bin/env python3
"""
Script 08: AI Enrichment — generate summaries for regulations

Uses Gemini 2.5 Flash via Vertex AI (billed to GCP credit).
Generates Thai-language summaries stored in content_summary field
of cg_document_chunks.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.gcp_vertex_client import generate_structured
from utils.structured_schemas import ENRICHMENT_SCHEMA
from tqdm import tqdm

SUMMARY_PROMPT_TEMPLATE = """คุณเป็นผู้เชี่ยวชาญด้านกฎหมายศุลกากรไทย
อ่านเอกสารด้านล่างแล้วสรุป:

เอกสาร: {doc_type} — {title}
เลขที่: {doc_number}

เนื้อหา:
{content}

---
กรุณาสรุป:
1. summary_th: สรุปสาระสำคัญ 2-3 ประโยค (ภาษาไทย)
2. summary_en: English summary 2-3 sentences
3. keywords: 5-10 คำสำคัญ (ทั้งไทยและอังกฤษ)
4. qa_pairs: คำถาม-คำตอบ 3-5 คู่ ที่ผู้ใช้งานอาจถาม (ภาษาพูด)

สำคัญ: ตอบเฉพาะจากเนื้อหาที่ให้ อย่าเดาหรือเพิ่มข้อมูลจากภายนอก"""


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "08_enrich_summaries")

    # Get regulations without summaries
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id::text, doc_type, doc_number, title, content, source_url
            FROM cg_regulations
            WHERE content IS NOT NULL
            AND LENGTH(content) > 50
            ORDER BY created_at
        """)
        regulations = cur.fetchall()

    print(f"Regulations to enrich: {len(regulations)}")

    enriched = 0
    for reg_id, doc_type, doc_number, title, content, source_url in tqdm(regulations, desc="Enriching"):
        source_key = f"enrich:{reg_id}"

        if tracker.is_processed(source_key):
            continue

        try:
            # Truncate content if too long (save tokens)
            truncated_content = content[:8000] if len(content) > 8000 else content

            prompt = SUMMARY_PROMPT_TEMPLATE.format(
                doc_type=doc_type or "REGULATION",
                title=title or "Untitled",
                doc_number=doc_number or "N/A",
                content=truncated_content,
            )

            result_text = generate_structured(prompt, response_schema=ENRICHMENT_SCHEMA)
            result = json.loads(result_text)

            # Update content_summary on existing chunks for this regulation
            summary_th = result.get("summary_th", "")
            keywords = result.get("keywords", [])

            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE cg_document_chunks
                    SET content_summary = %s,
                        metadata = metadata || %s::jsonb,
                        updated_at = NOW()
                    WHERE source_type = 'REGULATION' AND source_id = %s
                """, (
                    summary_th,
                    json.dumps({"keywords": keywords}, ensure_ascii=False),
                    reg_id,
                ))
            conn.commit()

            tracker.mark_processed(source_key, f"summary={len(summary_th)} chars, keywords={len(keywords)}")
            enriched += 1

        except Exception as e:
            print(f"\n  Error enriching {reg_id}: {e}")
            tracker.mark_failed(source_key, str(e))
            conn.rollback()

    print(f"\n{'='*40}")
    print(f"Enriched: {enriched} regulations")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
