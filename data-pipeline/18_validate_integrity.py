#!/usr/bin/env python3
"""
Script 18: Cross-reference validation for data integrity

Validates:
  1. FTA rates JOIN with cg_hs_codes (FK integrity)
  2. Document chunks have valid source references
  3. No orphan records
  4. Expected counts per table
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn

EXPECTED_COUNTS = {
    "cg_hs_codes": 13000,       # ~13,308
    "cg_document_chunks": 4000,  # ~4,628
    "cg_regulations": 700,       # ~715
    "cg_fta_rates": 100,         # should be ~5,000+ after scrape
}


def main():
    conn = get_db_conn()
    errors = []
    warnings = []

    print("=" * 60)
    print("DATA INTEGRITY VALIDATION")
    print("=" * 60)

    # 1. Table counts
    print("\n1. Table Counts")
    with conn.cursor() as cur:
        for table, expected_min in EXPECTED_COUNTS.items():
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            status = "OK" if count >= expected_min else "LOW"
            print(f"  {table}: {count} (expected >= {expected_min}) [{status}]")
            if count == 0:
                errors.append(f"{table} is EMPTY")
            elif count < expected_min:
                warnings.append(f"{table} has {count} rows (expected >= {expected_min})")

    # 2. FTA rates FK validation
    print("\n2. FTA Rates FK Validation")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM cg_fta_rates f
            WHERE NOT EXISTS (
                SELECT 1 FROM cg_hs_codes h WHERE h.code = f.hs_code
            )
        """)
        orphan_fta = cur.fetchone()[0]
        print(f"  Orphan FTA rates (no matching HS code): {orphan_fta}")
        if orphan_fta > 0:
            cur.execute("""
                SELECT DISTINCT f.hs_code, f.fta_name
                FROM cg_fta_rates f
                WHERE NOT EXISTS (
                    SELECT 1 FROM cg_hs_codes h WHERE h.code = f.hs_code
                )
                LIMIT 10
            """)
            for hs, fta in cur.fetchall():
                print(f"    orphan: {hs} ({fta})")
            warnings.append(f"{orphan_fta} FTA rates have no matching HS code")

    # 3. FTA coverage
    print("\n3. FTA Coverage")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT fta_name, COUNT(*), COUNT(DISTINCT hs_code)
            FROM cg_fta_rates
            GROUP BY fta_name
            ORDER BY fta_name
        """)
        rows = cur.fetchall()
        if rows:
            for fta, total, hs_count in rows:
                print(f"  {fta}: {total} rates, {hs_count} unique HS codes")
        else:
            print("  NO FTA RATES FOUND")
            errors.append("cg_fta_rates is empty — FTA scraping not done yet")

    # 4. HS codes with FTA rates
    print("\n4. HS Codes with FTA Rates")
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(DISTINCT hs_code) FROM cg_fta_rates")
        hs_with_fta = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        total_hs = cur.fetchone()[0]
        coverage = (hs_with_fta / total_hs * 100) if total_hs > 0 else 0
        print(f"  HS codes with FTA data: {hs_with_fta}/{total_hs} ({coverage:.1f}%)")

    # 5. Document chunks by source type
    print("\n5. Document Chunks by Source Type")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT source_type, COUNT(*),
                   AVG(LENGTH(chunk_text))::int AS avg_len
            FROM cg_document_chunks
            GROUP BY source_type
            ORDER BY source_type
        """)
        for stype, count, avg_len in cur.fetchall():
            print(f"  {stype}: {count} chunks (avg {avg_len} chars)")

    # 6. Embedding completeness
    print("\n6. Embedding Completeness")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS total,
                   COUNT(embedding) AS with_embedding
            FROM cg_document_chunks
        """)
        total, with_emb = cur.fetchone()
        pct = (with_emb / total * 100) if total > 0 else 0
        print(f"  Chunks with embeddings: {with_emb}/{total} ({pct:.1f}%)")
        if with_emb < total:
            warnings.append(f"{total - with_emb} chunks missing embeddings")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  [ERROR] {e}")
    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  [WARN] {w}")
    if not errors and not warnings:
        print("\n  ALL CHECKS PASSED")

    conn.close()
    return len(errors)


if __name__ == "__main__":
    exit_code = main()
    sys.exit(1 if exit_code > 0 else 0)
