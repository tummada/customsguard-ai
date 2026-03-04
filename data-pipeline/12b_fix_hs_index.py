#!/usr/bin/env python3
"""Fix: Rebuild only cg_hs_codes HNSW index with lower memory."""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn

conn = get_db_conn()
conn.autocommit = True
cur = conn.cursor()

print("Tuning for low-memory index build...")
cur.execute("SET maintenance_work_mem = '128MB'")
cur.execute("SET max_parallel_maintenance_workers = 0")

print("Dropping idx_cg_hs_embedding...")
cur.execute("DROP INDEX IF EXISTS idx_cg_hs_embedding")

print("Creating idx_cg_hs_embedding (HNSW m=16, ef_construction=64)...")
start = time.time()
cur.execute("""
    CREATE INDEX idx_cg_hs_embedding ON cg_hs_codes
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
""")
elapsed = time.time() - start
print(f"Done ({elapsed:.1f}s)")

# Verify
cur.execute("""
    SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
    FROM pg_indexes
    WHERE tablename IN ('cg_hs_codes', 'cg_document_chunks')
    AND indexname LIKE '%embedding%'
""")
for name, size in cur.fetchall():
    print(f"  {name}: {size}")

cur.close()
conn.close()
