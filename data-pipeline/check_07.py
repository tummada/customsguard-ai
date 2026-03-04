"""Check script 07 results"""
from config import get_db_conn
conn = get_db_conn()
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM cg_document_chunks")
print(f"Total chunks: {cur.fetchone()[0]}")
cur.execute("SELECT status, COUNT(*) FROM _pipeline_state WHERE pipeline_name = '07_chunk_and_embed' GROUP BY status")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")
