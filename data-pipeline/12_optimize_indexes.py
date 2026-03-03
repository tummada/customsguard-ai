#!/usr/bin/env python3
"""
Script 12: PostgreSQL tuning + rebuild HNSW indexes

Run this on scaled-up Cloud SQL (4 vCPU, 16 GB RAM) for fast index builds.
Then scale back down after completion.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn


def main():
    conn = get_db_conn()
    conn.autocommit = True
    cur = conn.cursor()

    print("=" * 60)
    print("  OPTIMIZE INDEXES — CustomsGuard Knowledge Base")
    print("=" * 60)

    # 1. Check current stats
    print("\n1. Current table sizes")
    print("-" * 40)
    for table in ["cg_hs_codes", "cg_fta_rates", "cg_regulations", "cg_document_chunks"]:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        cur.execute(f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))")
        size = cur.fetchone()[0]
        print(f"  {table}: {count:,} rows ({size})")

    # 2. Tune PostgreSQL for index building
    print("\n2. Tuning PostgreSQL for index building...")
    tune_commands = [
        "SET maintenance_work_mem = '2GB'",
        "SET max_parallel_maintenance_workers = 4",
    ]
    for cmd in tune_commands:
        print(f"  {cmd}")
        cur.execute(cmd)

    # 3. VACUUM ANALYZE before rebuilding
    print("\n3. VACUUM ANALYZE all tables...")
    for table in ["cg_hs_codes", "cg_fta_rates", "cg_regulations", "cg_document_chunks"]:
        print(f"  VACUUM ANALYZE {table}...")
        start = time.time()
        cur.execute(f"VACUUM ANALYZE {table}")
        elapsed = time.time() - start
        print(f"    Done ({elapsed:.1f}s)")

    # 4. Rebuild HNSW indexes
    print("\n4. Rebuilding HNSW indexes...")

    # Drop and recreate cg_document_chunks HNSW index
    print("  Dropping idx_cg_chunks_embedding...")
    cur.execute("DROP INDEX IF EXISTS idx_cg_chunks_embedding")

    print("  Creating idx_cg_chunks_embedding (HNSW m=24, ef_construction=128)...")
    start = time.time()
    cur.execute("""
        CREATE INDEX idx_cg_chunks_embedding ON cg_document_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 24, ef_construction = 128)
    """)
    elapsed = time.time() - start
    print(f"    Done ({elapsed:.1f}s)")

    # Drop and recreate cg_hs_codes HNSW index
    print("  Dropping idx_cg_hs_embedding...")
    cur.execute("DROP INDEX IF EXISTS idx_cg_hs_embedding")

    print("  Creating idx_cg_hs_embedding (HNSW m=24, ef_construction=128)...")
    start = time.time()
    cur.execute("""
        CREATE INDEX idx_cg_hs_embedding ON cg_hs_codes
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 24, ef_construction = 128)
    """)
    elapsed = time.time() - start
    print(f"    Done ({elapsed:.1f}s)")

    # 5. Final VACUUM
    print("\n5. Final VACUUM FULL...")
    for table in ["cg_hs_codes", "cg_document_chunks"]:
        print(f"  VACUUM (FULL, ANALYZE) {table}...")
        start = time.time()
        cur.execute(f"VACUUM (FULL, ANALYZE) {table}")
        elapsed = time.time() - start
        print(f"    Done ({elapsed:.1f}s)")

    # 6. Verify indexes
    print("\n6. Index verification")
    print("-" * 40)
    cur.execute("""
        SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
        FROM pg_indexes
        WHERE tablename IN ('cg_hs_codes', 'cg_document_chunks', 'cg_fta_rates', 'cg_regulations')
        ORDER BY tablename, indexname
    """)
    for name, size in cur.fetchall():
        print(f"  {name}: {size}")

    cur.close()
    conn.close()
    print("\nDone! Remember to scale down Cloud SQL after this.")


if __name__ == "__main__":
    main()
