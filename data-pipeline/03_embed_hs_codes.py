#!/usr/bin/env python3
"""
Script 03: Embed all HS codes using text-embedding-004

Uses Google AI free tier (not Vertex AI) — no GCP credit consumed.
Builds embedding text matching HsCodeService.buildEmbeddingText():
    "{code} {descriptionEn} {descriptionTh} {category}"
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.gcp_vertex_client import embed_text
from tqdm import tqdm


def build_embedding_text(row: tuple) -> str:
    """
    Match Java HsCodeService.buildEmbeddingText():
        code + descriptionEn + descriptionTh + category
    """
    code, desc_en, desc_th, category = row
    parts = [code]
    if desc_en:
        parts.append(desc_en)
    if desc_th:
        parts.append(desc_th)
    if category:
        parts.append(category)
    return " ".join(parts)


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "03_embed_hs_codes")

    # Get all un-embedded HS codes
    with conn.cursor() as cur:
        cur.execute("""
            SELECT code, description_en, description_th, category
            FROM cg_hs_codes
            WHERE embedded = FALSE OR embedding IS NULL
            ORDER BY code
        """)
        rows = cur.fetchall()

    print(f"HS codes to embed: {len(rows)}")

    if not rows:
        print("All HS codes already embedded!")
        return

    success = 0
    failed = 0

    for row in tqdm(rows, desc="Embedding"):
        code = row[0]
        source_key = f"hs_code:{code}"

        if tracker.is_processed(source_key):
            continue

        text = build_embedding_text(row)

        try:
            embedding = embed_text(text)

            # Store as PostgreSQL vector string: "[0.01,0.02,...]"
            vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE cg_hs_codes
                    SET embedding = %s::vector,
                        embedded = TRUE,
                        updated_at = NOW()
                    WHERE code = %s
                """, (vec_str, code))
            conn.commit()

            tracker.mark_processed(source_key, "embedded")
            success += 1

        except Exception as e:
            print(f"\n  Error embedding {code}: {e}")
            tracker.mark_failed(source_key, str(e))
            failed += 1

    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE embedded = TRUE")
        total_embedded = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        total = cur.fetchone()[0]

    print(f"\n{'='*40}")
    print(f"This run: {success} embedded, {failed} failed")
    print(f"Total embedded: {total_embedded}/{total}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
