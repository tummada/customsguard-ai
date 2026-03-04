"""Reset pipeline state for script 06"""
from config import get_db_conn
conn = get_db_conn()
cur = conn.cursor()
cur.execute("DELETE FROM _pipeline_state WHERE pipeline_name = '06_extract_rulings_pdf'")
conn.commit()
print(f"Reset {cur.rowcount} rows")
