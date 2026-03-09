#!/usr/bin/env python3
"""
Script 13: pg_dump — Export all CustomsGuard tables

Creates a SQL dump of all cg_* tables + _pipeline_state
that can be restored into local/production database.

Output: data/cg_dump_YYYYMMDD.sql.gz
"""

import os
import sys
import subprocess
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

TABLES = [
    "cg_hs_codes",
    "cg_fta_rates",
    "cg_regulations",
    "cg_document_chunks",
    "_pipeline_state",
]


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    dump_file = os.path.join(OUTPUT_DIR, f"cg_dump_{timestamp}.sql.gz")

    print(f"Dumping {len(TABLES)} tables from Cloud SQL...")
    print(f"Output: {dump_file}")

    # Build pg_dump command
    table_args = []
    for t in TABLES:
        table_args.extend(["-t", t])

    cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-p", str(DB_PORT),
        "-U", DB_USER,
        "-d", DB_NAME,
        "--no-owner",
        "--no-acl",
        "--clean",
        "--if-exists",
    ] + table_args

    # WARNING: PGPASSWORD in env is visible via /proc and `ps e`.
    # For production use, prefer ~/.pgpass file (chmod 600) instead.
    # See: https://www.postgresql.org/docs/current/libpq-pgpass.html
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    print("\nRunning pg_dump...")
    with open(dump_file.replace(".gz", ""), "w") as f:
        result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, env=env, text=True)

    if result.returncode != 0:
        print(f"ERROR: pg_dump failed!\n{result.stderr}")
        sys.exit(1)

    # Compress
    print("Compressing...")
    subprocess.run(["gzip", "-f", dump_file.replace(".gz", "")], check=True)

    size_mb = os.path.getsize(dump_file) / (1024 * 1024)
    print(f"\nDone! {dump_file} ({size_mb:.1f} MB)")
    print(f"\nTo restore locally:")
    print(f"  gunzip -c {os.path.basename(dump_file)} | psql -h localhost -U saas_admin -d vollos_dev")


if __name__ == "__main__":
    main()
