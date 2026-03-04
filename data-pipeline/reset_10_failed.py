"""Reset only FAILED entries for script 10"""
from config import get_db_conn
conn = get_db_conn()
cur = conn.cursor()
cur.execute("DELETE FROM _pipeline_state WHERE pipeline_name = '10_cross_reference' AND status = 'FAILED'")
conn.commit()
print(f"Reset {cur.rowcount} failed entries")
