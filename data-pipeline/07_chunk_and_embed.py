#!/usr/bin/env python3
"""
Script 07: Chunk regulations → embed → cg_document_chunks

Chunks regulation content into 512-token pieces with 50-token overlap.
Embeds using text-embedding-004 (free tier).
Stores with full provenance metadata.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.chunker import chunk_regulation
from utils.gcp_vertex_client import embed_text
from tqdm import tqdm


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "07_chunk_and_embed")

    # Get all regulations not yet chunked
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
        print("All regulations already chunked!")
        return

    total_chunks = 0

    for reg_id, content, source_url, doc_number, doc_type, title in tqdm(regulations, desc="Chunking"):
        source_key = f"regulation:{reg_id}"

        if tracker.is_processed(source_key):
            continue

        if not content or len(content.strip()) < 20:
            tracker.mark_skipped(source_key, "content too short")
            continue

        try:
            # Chunk the content
            chunks = chunk_regulation(
                regulation_id=reg_id,
                content=content,
                source_url=source_url or "",
                doc_number=doc_number or "",
            )

            if not chunks:
                tracker.mark_skipped(source_key, "no chunks produced")
                continue

            # Embed and insert each chunk
            for chunk in chunks:
                # Build embedding text: include doc context for better retrieval
                embed_text_str = f"{doc_type or ''} {doc_number or ''} {title or ''}\n{chunk['chunk_text']}"
                embedding = embed_text(embed_text_str)
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

                # Merge metadata
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
                total_chunks += 1

            tracker.mark_processed(source_key, f"{len(chunks)} chunks")

        except Exception as e:
            print(f"\n  Error processing {reg_id}: {e}")
            tracker.mark_failed(source_key, str(e))
            conn.rollback()

    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_document_chunks WHERE source_type = 'REGULATION'")
        total = cur.fetchone()[0]

    print(f"\n{'='*40}")
    print(f"New chunks created: {total_chunks}")
    print(f"Total regulation chunks in DB: {total}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
