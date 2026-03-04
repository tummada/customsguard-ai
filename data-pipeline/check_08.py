"""Check script 08 enrichment progress"""
from config import get_db_conn
conn = get_db_conn()
cur = conn.cursor()

# Check pipeline state
cur.execute("SELECT status, COUNT(*) FROM _pipeline_state WHERE pipeline_name = '08_enrich_summaries' GROUP BY status")
print("Pipeline state (08_enrich_summaries):")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Check total regulations
cur.execute("SELECT COUNT(*) FROM cg_regulations")
print(f"\nTotal regulations: {cur.fetchone()[0]}")

# Check if enrichment columns exist and have data
try:
    cur.execute("SELECT COUNT(*) FROM cg_regulations WHERE summary_thai IS NOT NULL AND summary_thai != ''")
    print(f"With Thai summary: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM cg_regulations WHERE summary_en IS NOT NULL AND summary_en != ''")
    print(f"With English summary: {cur.fetchone()[0]}")
except Exception as e:
    print(f"Column check error: {e}")
    conn.rollback()

conn.close()
