import psycopg2
from config import get_db_conn
conn = get_db_conn()
conn.autocommit = True
cur = conn.cursor()
cur.execute("ALTER TABLE cg_hs_codes ALTER COLUMN heading TYPE VARCHAR(12)")
cur.execute("ALTER TABLE cg_hs_codes ALTER COLUMN subheading TYPE VARCHAR(12)")
print("COLUMNS FIXED")
conn.close()
