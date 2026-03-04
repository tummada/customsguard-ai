"""Reset state tracker for 01b and re-run parse."""
from config import get_db_conn

conn = get_db_conn()
conn.autocommit = True
cur = conn.cursor()

# Reset state
cur.execute("DELETE FROM _pipeline_state WHERE pipeline_name = '01b_parse_hs_realdata'")
print("State reset OK")

conn.close()
