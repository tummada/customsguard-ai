#!/usr/bin/env python3
"""
Script 10: Embed supplementary data → cg_document_chunks

Reads all records from:
- cg_lpi_controls (import license requirements)
- cg_boi_privileges (BOI investment privileges)
- cg_excise_rates (excise tax rates)
- cg_ad_duties (anti-dumping / countervailing duties)

Builds embedding text from key fields, chunks, embeds via Vertex AI,
and inserts into cg_document_chunks with appropriate source_type.

Uses StateTracker for resumable processing.
Uses Vertex AI batch embedding (billed to GCP credit).
"""

import os
import sys
import json
import time
import logging

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.state_tracker import StateTracker
from utils.chunker import chunk_text

import google.auth
import google.auth.transport.requests
import requests as http_requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

PROJECT = "customs-guard-ai"
REGION = "us-central1"
EMBED_URL = (
    f"https://{REGION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT}"
    f"/locations/{REGION}/publishers/google/models/gemini-embedding-001:predict"
)
BATCH_SIZE = 50


def get_token():
    """Get GCP auth token for Vertex AI."""
    creds, _ = google.auth.default()
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def batch_embed(texts: list[str], token: str) -> list[list[float]]:
    """Batch embed texts via Vertex AI."""
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


def insert_chunks(conn, chunks_with_embeddings: list[dict]):
    """Insert chunks with embeddings into cg_document_chunks."""
    for item in chunks_with_embeddings:
        vec_str = "[" + ",".join(str(v) for v in item["embedding"]) + "]"

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_document_chunks
                    (source_type, source_id, chunk_index, chunk_text,
                     embedding, metadata)
                VALUES (%s, %s, %s, %s, %s::vector, %s::jsonb)
            """, (
                item["source_type"],
                item["source_id"],
                item["chunk_index"],
                item["chunk_text"],
                vec_str,
                json.dumps(item["metadata"], ensure_ascii=False),
            ))
    conn.commit()


# ═══════════════════════════════════════════════════════════
# Source 1: LPI Controls
# ═══════════════════════════════════════════════════════════

def build_lpi_text(row: tuple) -> str:
    """Build embedding text from LPI control record."""
    rec_id, hs_code, control_type, agency_code, agency_name_th, agency_name_en, req_th, req_en = row

    parts = [
        f"ใบอนุญาตนำเข้า/ส่งออก ({control_type})",
        f"หน่วยงาน: {agency_name_th or ''} ({agency_name_en or ''})",
        f"พิกัดศุลกากร: {hs_code}",
    ]
    if req_th:
        parts.append(f"เงื่อนไข: {req_th}")
    if req_en:
        parts.append(f"Requirement: {req_en}")

    return "\n".join(parts)


def process_lpi_controls(conn, tracker: StateTracker, token: str) -> tuple[int, str]:
    """Embed LPI controls and insert into cg_document_chunks."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT l.id::text, l.hs_code, l.control_type, l.agency_code,
                   l.agency_name_th, l.agency_name_en,
                   l.requirement_th, l.requirement_en
            FROM cg_lpi_controls l
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_document_chunks dc
                WHERE dc.source_type = 'LPI_CONTROL'
                AND dc.source_id = l.id::text
            )
            ORDER BY l.created_at
        """)
        records = cur.fetchall()

    logger.info(f"  LPI controls to embed: {len(records)}")
    if not records:
        return 0, token

    total_chunks = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        source_keys = [f"lpi_embed:{row[0]}" for row in batch]

        # Skip already processed
        batch_filtered = [
            (row, sk) for row, sk in zip(batch, source_keys)
            if not tracker.is_processed(sk)
        ]
        if not batch_filtered:
            continue

        batch_records = [bf[0] for bf in batch_filtered]
        batch_source_keys = [bf[1] for bf in batch_filtered]

        try:
            # Build texts
            embed_texts = [build_lpi_text(row) for row in batch_records]

            # Embed
            embeddings = batch_embed(embed_texts, token)

            # Build chunks and insert
            chunks_to_insert = []
            for row, embedding, text in zip(batch_records, embeddings, embed_texts):
                rec_id = row[0]
                chunks = chunk_text(text, chunk_size=512, overlap=50, metadata={
                    "hs_code": row[1],
                    "agency_code": row[3],
                    "control_type": row[2],
                })

                for chunk in chunks:
                    chunks_to_insert.append({
                        "source_type": "LPI_CONTROL",
                        "source_id": rec_id,
                        "chunk_index": chunk["chunk_index"],
                        "chunk_text": chunk["chunk_text"],
                        "embedding": embedding,
                        "metadata": chunk["metadata"],
                    })

            insert_chunks(conn, chunks_to_insert)
            total_chunks += len(chunks_to_insert)

            for sk in batch_source_keys:
                tracker.mark_processed(sk, "embedded")

        except Exception as e:
            conn.rollback()
            logger.error(f"  LPI batch error: {e}")
            for sk in batch_source_keys:
                tracker.mark_failed(sk, str(e))

        # Refresh token periodically
        if (i + BATCH_SIZE) % (BATCH_SIZE * 10) == 0:
            token = get_token()

    return total_chunks, token


# ═══════════════════════════════════════════════════════════
# Source 2: BOI Privileges
# ═══════════════════════════════════════════════════════════

def build_boi_text(row: tuple) -> str:
    """Build embedding text from BOI privilege record."""
    rec_id, activity_code, name_th, name_en, hs_codes, priv_type, section_ref, duty_red, conditions = row

    parts = [
        f"สิทธิประโยชน์ BOI ({priv_type})",
        f"กิจกรรม: {activity_code or ''} — {name_th or ''} ({name_en or ''})",
    ]
    if section_ref:
        parts.append(f"มาตรา: {section_ref}")
    if hs_codes:
        parts.append(f"พิกัดที่เกี่ยวข้อง: {', '.join(hs_codes)}")
    if duty_red is not None:
        parts.append(f"ลดหย่อนอากร: {duty_red}%")
    else:
        parts.append("ยกเว้นอากรทั้งหมด")
    if conditions:
        parts.append(f"เงื่อนไข: {conditions}")

    return "\n".join(parts)


def process_boi_privileges(conn, tracker: StateTracker, token: str) -> tuple[int, str]:
    """Embed BOI privileges and insert into cg_document_chunks."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT b.id::text, b.activity_code, b.activity_name_th, b.activity_name_en,
                   b.hs_codes, b.privilege_type, b.section_ref,
                   b.duty_reduction, b.conditions
            FROM cg_boi_privileges b
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_document_chunks dc
                WHERE dc.source_type = 'BOI_PRIVILEGE'
                AND dc.source_id = b.id::text
            )
            ORDER BY b.created_at
        """)
        records = cur.fetchall()

    logger.info(f"  BOI privileges to embed: {len(records)}")
    if not records:
        return 0, token

    total_chunks = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        source_keys = [f"boi_embed:{row[0]}" for row in batch]

        batch_filtered = [
            (row, sk) for row, sk in zip(batch, source_keys)
            if not tracker.is_processed(sk)
        ]
        if not batch_filtered:
            continue

        batch_records = [bf[0] for bf in batch_filtered]
        batch_source_keys = [bf[1] for bf in batch_filtered]

        try:
            embed_texts = [build_boi_text(row) for row in batch_records]
            embeddings = batch_embed(embed_texts, token)

            chunks_to_insert = []
            for row, embedding, text in zip(batch_records, embeddings, embed_texts):
                rec_id = row[0]
                hs_codes_val = row[4] if row[4] else []
                chunks = chunk_text(text, chunk_size=512, overlap=50, metadata={
                    "activity_code": row[1] or "",
                    "privilege_type": row[5],
                    "hs_codes": hs_codes_val,
                })

                for chunk in chunks:
                    chunks_to_insert.append({
                        "source_type": "BOI_PRIVILEGE",
                        "source_id": rec_id,
                        "chunk_index": chunk["chunk_index"],
                        "chunk_text": chunk["chunk_text"],
                        "embedding": embedding,
                        "metadata": chunk["metadata"],
                    })

            insert_chunks(conn, chunks_to_insert)
            total_chunks += len(chunks_to_insert)

            for sk in batch_source_keys:
                tracker.mark_processed(sk, "embedded")

        except Exception as e:
            conn.rollback()
            logger.error(f"  BOI batch error: {e}")
            for sk in batch_source_keys:
                tracker.mark_failed(sk, str(e))

        if (i + BATCH_SIZE) % (BATCH_SIZE * 10) == 0:
            token = get_token()

    return total_chunks, token


# ═══════════════════════════════════════════════════════════
# Source 3: Excise Tax Rates
# ═══════════════════════════════════════════════════════════

def build_excise_text(row: tuple) -> str:
    """Build embedding text from excise rate record."""
    rec_id, hs_code, category, rate, specific, method, conditions = row

    parts = [
        f"ภาษีสรรพสามิต (Excise Tax)",
        f"พิกัดศุลกากร: {hs_code}",
        f"ประเภทสินค้า: {category or ''}",
        f"วิธีคำนวณ: {method or 'AD_VALOREM'}",
    ]
    if rate is not None:
        parts.append(f"อัตรา Ad Valorem: {rate}%")
    if specific:
        parts.append(f"อัตราตามปริมาณ: {specific}")
    if conditions:
        parts.append(f"เงื่อนไข: {conditions}")

    return "\n".join(parts)


def process_excise_rates(conn, tracker: StateTracker, token: str) -> tuple[int, str]:
    """Embed excise rates and insert into cg_document_chunks."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id::text, e.hs_code, e.product_category, e.excise_rate,
                   e.excise_rate_specific, e.calculation_method, e.conditions
            FROM cg_excise_rates e
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_document_chunks dc
                WHERE dc.source_type = 'EXCISE_RATE'
                AND dc.source_id = e.id::text
            )
            ORDER BY e.created_at
        """)
        records = cur.fetchall()

    logger.info(f"  Excise rates to embed: {len(records)}")
    if not records:
        return 0, token

    total_chunks = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        source_keys = [f"excise_embed:{row[0]}" for row in batch]

        batch_filtered = [
            (row, sk) for row, sk in zip(batch, source_keys)
            if not tracker.is_processed(sk)
        ]
        if not batch_filtered:
            continue

        batch_records = [bf[0] for bf in batch_filtered]
        batch_source_keys = [bf[1] for bf in batch_filtered]

        try:
            embed_texts = [build_excise_text(row) for row in batch_records]
            embeddings = batch_embed(embed_texts, token)

            chunks_to_insert = []
            for row, embedding, text in zip(batch_records, embeddings, embed_texts):
                rec_id = row[0]
                chunks = chunk_text(text, chunk_size=512, overlap=50, metadata={
                    "hs_code": row[1],
                    "product_category": row[2] or "",
                    "calculation_method": row[5] or "AD_VALOREM",
                })

                for chunk in chunks:
                    chunks_to_insert.append({
                        "source_type": "EXCISE_RATE",
                        "source_id": rec_id,
                        "chunk_index": chunk["chunk_index"],
                        "chunk_text": chunk["chunk_text"],
                        "embedding": embedding,
                        "metadata": chunk["metadata"],
                    })

            insert_chunks(conn, chunks_to_insert)
            total_chunks += len(chunks_to_insert)

            for sk in batch_source_keys:
                tracker.mark_processed(sk, "embedded")

        except Exception as e:
            conn.rollback()
            logger.error(f"  Excise batch error: {e}")
            for sk in batch_source_keys:
                tracker.mark_failed(sk, str(e))

        if (i + BATCH_SIZE) % (BATCH_SIZE * 10) == 0:
            token = get_token()

    return total_chunks, token


# ═══════════════════════════════════════════════════════════
# Source 4: Anti-Dumping Duties
# ═══════════════════════════════════════════════════════════

def build_ad_text(row: tuple) -> str:
    """Build embedding text from AD duty record."""
    rec_id, hs_code, prod_th, prod_en, country, duty_type, rate, eff_from, announcement = row

    parts = [
        f"มาตรการตอบโต้การทุ่มตลาด ({duty_type})",
        f"พิกัดศุลกากร: {hs_code}",
        f"สินค้า: {prod_th or ''} ({prod_en or ''})",
        f"ประเทศต้นทาง: {country}",
        f"อัตราอากรพิเศษ: {rate}%",
    ]
    if eff_from:
        parts.append(f"มีผลตั้งแต่: {eff_from}")
    if announcement:
        parts.append(f"ประกาศเลขที่: {announcement}")

    return "\n".join(parts)


def process_ad_duties(conn, tracker: StateTracker, token: str) -> tuple[int, str]:
    """Embed AD duties and insert into cg_document_chunks."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.id::text, a.hs_code, a.product_name_th, a.product_name_en,
                   a.origin_country, a.duty_type, a.additional_rate,
                   a.effective_from, a.announcement_number
            FROM cg_ad_duties a
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_document_chunks dc
                WHERE dc.source_type = 'AD_DUTY'
                AND dc.source_id = a.id::text
            )
            ORDER BY a.created_at
        """)
        records = cur.fetchall()

    logger.info(f"  AD duties to embed: {len(records)}")
    if not records:
        return 0, token

    total_chunks = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        source_keys = [f"ad_embed:{row[0]}" for row in batch]

        batch_filtered = [
            (row, sk) for row, sk in zip(batch, source_keys)
            if not tracker.is_processed(sk)
        ]
        if not batch_filtered:
            continue

        batch_records = [bf[0] for bf in batch_filtered]
        batch_source_keys = [bf[1] for bf in batch_filtered]

        try:
            embed_texts = [build_ad_text(row) for row in batch_records]
            embeddings = batch_embed(embed_texts, token)

            chunks_to_insert = []
            for row, embedding, text in zip(batch_records, embeddings, embed_texts):
                rec_id = row[0]
                chunks = chunk_text(text, chunk_size=512, overlap=50, metadata={
                    "hs_code": row[1],
                    "origin_country": row[4],
                    "duty_type": row[5],
                })

                for chunk in chunks:
                    chunks_to_insert.append({
                        "source_type": "AD_DUTY",
                        "source_id": rec_id,
                        "chunk_index": chunk["chunk_index"],
                        "chunk_text": chunk["chunk_text"],
                        "embedding": embedding,
                        "metadata": chunk["metadata"],
                    })

            insert_chunks(conn, chunks_to_insert)
            total_chunks += len(chunks_to_insert)

            for sk in batch_source_keys:
                tracker.mark_processed(sk, "embedded")

        except Exception as e:
            conn.rollback()
            logger.error(f"  AD batch error: {e}")
            for sk in batch_source_keys:
                tracker.mark_failed(sk, str(e))

        if (i + BATCH_SIZE) % (BATCH_SIZE * 10) == 0:
            token = get_token()

    return total_chunks, token


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "10_embed_supplementary")

    logger.info("=" * 60)
    logger.info("Script 10: Embed Supplementary Data → cg_document_chunks")
    logger.info("=" * 60)

    token = get_token()
    start_time = time.time()

    # Process each source
    logger.info("\n--- Source 1: LPI Controls ---")
    lpi_chunks, token = process_lpi_controls(conn, tracker, token)

    logger.info("\n--- Source 2: BOI Privileges ---")
    boi_chunks, token = process_boi_privileges(conn, tracker, token)

    logger.info("\n--- Source 3: Excise Rates ---")
    excise_chunks, token = process_excise_rates(conn, tracker, token)

    logger.info("\n--- Source 4: AD Duties ---")
    ad_chunks, token = process_ad_duties(conn, tracker, token)

    # Final stats
    elapsed = time.time() - start_time

    with conn.cursor() as cur:
        cur.execute("""
            SELECT source_type, COUNT(*)
            FROM cg_document_chunks
            WHERE source_type IN ('LPI_CONTROL', 'BOI_PRIVILEGE', 'EXCISE_RATE', 'AD_DUTY')
            GROUP BY source_type
            ORDER BY source_type
        """)
        by_type = cur.fetchall()

        cur.execute("SELECT COUNT(*) FROM cg_document_chunks")
        grand_total = cur.fetchone()[0]

    logger.info(f"\n{'='*60}")
    logger.info(f"Embedding complete in {elapsed:.0f}s")
    logger.info(f"New chunks this run:")
    logger.info(f"  LPI Controls:  {lpi_chunks}")
    logger.info(f"  BOI Privileges: {boi_chunks}")
    logger.info(f"  Excise Rates:  {excise_chunks}")
    logger.info(f"  AD Duties:     {ad_chunks}")
    logger.info(f"  Total new:     {lpi_chunks + boi_chunks + excise_chunks + ad_chunks}")
    logger.info(f"\nTotal supplementary chunks in DB:")
    for source_type, count in by_type:
        logger.info(f"  {source_type}: {count}")
    logger.info(f"\nGrand total document chunks: {grand_total}")
    logger.info(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
