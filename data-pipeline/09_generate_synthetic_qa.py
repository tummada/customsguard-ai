#!/usr/bin/env python3
"""
Script 09: Generate Synthetic Q&A chunks

Uses Gemini 2.5 Flash via Vertex AI to create question-answer pairs
from regulations. These bridge the gap between legal language and
natural user queries.

Each Q&A pair becomes a new chunk in cg_document_chunks with
source_type = 'SYNTHETIC_QA' and metadata.derived_from linking
back to the original regulation.

Embedding uses Vertex AI (billed to GCP credit, not free tier).
"""

import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.gcp_vertex_client import generate_structured
from utils.structured_schemas import ENRICHMENT_SCHEMA

import google.auth
import google.auth.transport.requests
import requests as http_requests

PROJECT = "customs-guard-ai"
REGION = "us-central1"
EMBED_URL = f"https://{REGION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/gemini-embedding-001:predict"

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


def get_token():
    creds, _ = google.auth.default()
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def batch_embed(texts, token):
    resp = http_requests.post(
        EMBED_URL,
        headers={"Authorization": f"Bearer {token}"},
        json={
            "instances": [{"content": t, "task_type": "RETRIEVAL_DOCUMENT"} for t in texts],
            "parameters": {"outputDimensionality": 768},
        },
        timeout=120,
    )
    if resp.status_code == 401:
        raise TokenExpiredError("Token expired")
    resp.raise_for_status()
    return [p["embeddings"]["values"] for p in resp.json()["predictions"]]


class TokenExpiredError(Exception):
    pass


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

    token = get_token()
    total_qa_chunks = 0
    start_time = time.time()

    for i, (reg_id, doc_type, doc_number, title, content, source_url) in enumerate(regulations):
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

            # Build all Q&A texts for batch embedding
            qa_texts = []
            valid_pairs = []
            for qi, qa in enumerate(qa_pairs):
                question = qa.get("question", "")
                answer = qa.get("answer", "")
                if question and answer:
                    qa_texts.append(f"คำถาม: {question}\nคำตอบ: {answer}")
                    valid_pairs.append((qi, qa))

            if not qa_texts:
                tracker.mark_processed(source_key, "no valid Q&A pairs")
                continue

            # Batch embed all Q&A texts at once (retry on token expiry)
            try:
                embeddings = batch_embed(qa_texts, token)
            except TokenExpiredError:
                print(f"  Token expired, refreshing...", flush=True)
                token = get_token()
                embeddings = batch_embed(qa_texts, token)

            # Insert all Q&A chunks
            for (qi, qa), chunk_text, embedding in zip(valid_pairs, qa_texts, embeddings):
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

                metadata = {
                    "source_url": source_url or "",
                    "derived_from": reg_id,
                    "regulation_doc_number": doc_number or "",
                    "regulation_title": title or "",
                    "question": qa.get("question", ""),
                    "answer": qa.get("answer", ""),
                    "related_hs_codes": qa.get("related_hs_codes", []),
                }

                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO cg_document_chunks
                            (source_type, source_id, chunk_index, chunk_text,
                             embedding, metadata)
                        VALUES ('SYNTHETIC_QA', %s, %s, %s, %s::vector, %s::jsonb)
                    """, (
                        reg_id,
                        qi,
                        chunk_text,
                        vec_str,
                        json.dumps(metadata, ensure_ascii=False),
                    ))
            conn.commit()
            total_qa_chunks += len(valid_pairs)
            tracker.mark_processed(source_key, f"{len(valid_pairs)} Q&A pairs")

            # Progress every 50 regulations
            if (i + 1) % 50 == 0:
                elapsed = time.time() - start_time
                print(f"  {i+1}/{len(regulations)} regs, {total_qa_chunks} Q&A chunks, {elapsed:.0f}s", flush=True)

            # Refresh token every 100 regs (tokens expire in ~1 hour)
            if (i + 1) % 100 == 0:
                token = get_token()

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

    elapsed = time.time() - start_time
    print(f"\n{'='*40}")
    print(f"New synthetic Q&A chunks: {total_qa_chunks}")
    print(f"Total Q&A chunks in DB: {total}")
    print(f"Total all chunks in DB: {total_all}")
    print(f"Time: {elapsed:.0f}s")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
