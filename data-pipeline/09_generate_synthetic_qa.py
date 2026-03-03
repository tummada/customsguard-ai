#!/usr/bin/env python3
"""
Script 09: Generate Synthetic Q&A chunks

Uses Gemini 2.5 Flash via Vertex AI to create question-answer pairs
from regulations. These bridge the gap between legal language and
natural user queries.

Each Q&A pair becomes a new chunk in cg_document_chunks with
source_type = 'SYNTHETIC_QA' and metadata.derived_from linking
back to the original regulation.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.gcp_vertex_client import generate_structured, embed_text
from utils.structured_schemas import ENRICHMENT_SCHEMA
from tqdm import tqdm

QA_PROMPT_TEMPLATE = """คุณเป็นผู้เชี่ยวชาญด้านศุลกากรไทย กรุณาอ่านเอกสารด้านล่าง
แล้วสร้างคำถาม-คำตอบ 3-5 คู่ ที่ผู้ประกอบการนำเข้า-ส่งออกอาจถาม

เอกสาร: {doc_type} — {title}
เลขที่: {doc_number}

เนื้อหา:
{content}

---
สร้างคำถามในรูปแบบภาษาพูดที่ผู้ใช้จะพิมพ์ลงในระบบค้นหา เช่น:
- "นำเข้ารถยนต์ไฟฟ้าเสียภาษีเท่าไหร่"
- "ต้องใช้ Form อะไรในการขอสิทธิ FTA กับจีน"
- "สินค้า XXX จัดอยู่พิกัดอะไร"

คำตอบต้องอ้างอิงจากเนื้อหาเอกสารเท่านั้น ห้ามเดา
ถ้ามี HS code ที่เกี่ยวข้อง ให้ระบุด้วย"""


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "09_generate_synthetic_qa")

    # Get regulations to generate Q&A for
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id::text, doc_type, doc_number, title, content, source_url
            FROM cg_regulations
            WHERE content IS NOT NULL
            AND LENGTH(content) > 100
            ORDER BY created_at
        """)
        regulations = cur.fetchall()

    print(f"Regulations to generate Q&A for: {len(regulations)}")

    total_qa_chunks = 0

    for reg_id, doc_type, doc_number, title, content, source_url in tqdm(regulations, desc="Generating Q&A"):
        source_key = f"qa:{reg_id}"

        if tracker.is_processed(source_key):
            continue

        try:
            truncated_content = content[:6000] if len(content) > 6000 else content

            prompt = QA_PROMPT_TEMPLATE.format(
                doc_type=doc_type or "REGULATION",
                title=title or "Untitled",
                doc_number=doc_number or "N/A",
                content=truncated_content,
            )

            result_text = generate_structured(prompt, response_schema=ENRICHMENT_SCHEMA)
            result = json.loads(result_text)

            qa_pairs = result.get("qa_pairs", [])
            if not qa_pairs:
                tracker.mark_processed(source_key, "no Q&A generated")
                continue

            # Create a chunk for each Q&A pair
            for i, qa in enumerate(qa_pairs):
                question = qa.get("question", "")
                answer = qa.get("answer", "")
                related_hs = qa.get("related_hs_codes", [])

                if not question or not answer:
                    continue

                # Chunk text: combine Q and A for embedding
                chunk_text = f"คำถาม: {question}\nคำตอบ: {answer}"

                # Embed the Q&A text
                embedding = embed_text(chunk_text)
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

                metadata = {
                    "source_url": source_url or "",
                    "derived_from": reg_id,
                    "regulation_doc_number": doc_number or "",
                    "regulation_title": title or "",
                    "question": question,
                    "answer": answer,
                    "related_hs_codes": related_hs,
                }

                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO cg_document_chunks
                            (source_type, source_id, chunk_index, chunk_text,
                             embedding, metadata)
                        VALUES ('SYNTHETIC_QA', %s, %s, %s, %s::vector, %s::jsonb)
                    """, (
                        reg_id,
                        i,
                        chunk_text,
                        vec_str,
                        json.dumps(metadata, ensure_ascii=False),
                    ))
                conn.commit()
                total_qa_chunks += 1

            tracker.mark_processed(source_key, f"{len(qa_pairs)} Q&A pairs")

        except Exception as e:
            print(f"\n  Error generating Q&A for {reg_id}: {e}")
            tracker.mark_failed(source_key, str(e))
            conn.rollback()

    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_document_chunks WHERE source_type = 'SYNTHETIC_QA'")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_document_chunks")
        total_all = cur.fetchone()[0]

    print(f"\n{'='*40}")
    print(f"New synthetic Q&A chunks: {total_qa_chunks}")
    print(f"Total Q&A chunks in DB: {total}")
    print(f"Total all chunks in DB: {total_all}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
