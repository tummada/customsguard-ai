#!/usr/bin/env python3
"""
Script 07: Chunk regulations → embed (Vertex AI) → cg_document_chunks
"""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.chunker import chunk_regulation

import google.auth
import google.auth.transport.requests
import requests as http_requests

PROJECT = "customs-guard-ai"
REGION = "us-central1"
EMBED_URL = f"https://{REGION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/gemini-embedding-001:predict"
BATCH_SIZE = 50


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
    resp.raise_for_status()
    return [p["embeddings"]["values"] for p in resp.json()["predictions"]]


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "07_chunk_and_embed")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT r.id::text, r.content, r.source_url, r.doc_number, r.doc_type, r.title
            FROM cg_regulations r
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_document_chunks dc
                WHERE dc.source_type = 'REGULATION'
                AND dc.source_id = r.id::text
            )
            ORDER BY r.created_at
        """)
        regulations = cur.fetchall()

    print(f"Regulations to chunk + embed: {len(regulations)}")
    if not regulations:
        print("All done!")
        return

    token = get_token()
    total_chunks = 0
    start_time = time.time()

    for i, (reg_id, content, source_url, doc_number, doc_type, title) in enumerate(regulations):
        source_key = f"regulation:{reg_id}"

        if tracker.is_processed(source_key):
            continue

        if not content or len(content.strip()) < 20:
            tracker.mark_skipped(source_key, "content too short")
            continue

        try:
            chunks = chunk_regulation(
                regulation_id=reg_id,
                content=content,
                source_url=source_url or "",
                doc_number=doc_number or "",
            )

            if not chunks:
                tracker.mark_skipped(source_key, "no chunks produced")
                continue

            # Build embedding texts
            embed_texts = [
                f"{doc_type or ''} {doc_number or ''} {title or ''}\n{c['chunk_text']}"
                for c in chunks
            ]

            # Batch embed
            embeddings = batch_embed(embed_texts, token)

            # Insert all chunks
            for chunk, embedding in zip(chunks, embeddings):
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
                metadata = chunk["metadata"]
                metadata["doc_type"] = doc_type
                metadata["title"] = title

                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO cg_document_chunks
                            (source_type, source_id, chunk_index, chunk_text,
                             embedding, metadata)
                        VALUES (%s, %s, %s, %s, %s::vector, %s::jsonb)
                    """, (
                        chunk["source_type"],
                        chunk["source_id"],
                        chunk["chunk_index"],
                        chunk["chunk_text"],
                        vec_str,
                        json.dumps(metadata, ensure_ascii=False),
                    ))

            conn.commit()
            total_chunks += len(chunks)
            tracker.mark_processed(source_key, f"{len(chunks)} chunks")

            # Progress every 50 regulations
            if (i + 1) % 50 == 0:
                elapsed = time.time() - start_time
                print(f"  {i+1}/{len(regulations)} regs, {total_chunks} chunks, {elapsed:.0f}s", flush=True)

            # Refresh token every 500
            if (i + 1) % 500 == 0:
                token = get_token()

        except Exception as e:
            conn.rollback()
            print(f"\n  Error {reg_id}: {e}")
            tracker.mark_failed(source_key, str(e))

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_document_chunks WHERE source_type = 'REGULATION'")
        total = cur.fetchone()[0]

    elapsed = time.time() - start_time
    print(f"\n{'='*40}")
    print(f"New chunks: {total_chunks}, Time: {elapsed:.0f}s")
    print(f"Total regulation chunks in DB: {total}")
    print(f"Progress: {tracker.get_progress()}")
    conn.close()


if __name__ == "__main__":
    main()
