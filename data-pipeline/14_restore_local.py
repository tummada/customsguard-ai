#!/usr/bin/env python3
"""
Script 14: Restore dump into local Docker PostgreSQL

Reads the latest cg_dump_*.sql.gz and restores it into local dev DB.
Assumes docker-compose.dev.yml is running (PostgreSQL on localhost:5432).
"""

import os
import sys
import glob
import subprocess

sys.path.insert(0, os.path.dirname(__file__))

# Local Docker DB
LOCAL_HOST = "localhost"
LOCAL_PORT = "5432"
LOCAL_DB = "vollos_dev"
LOCAL_USER = "saas_admin"
LOCAL_PASS = "dev_password_2024"

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def find_latest_dump():
    """Find the most recent dump file."""
    pattern = os.path.join(DATA_DIR, "cg_dump_*.sql.gz")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"ERROR: No dump files found in {DATA_DIR}")
        sys.exit(1)
    return files[-1]


def main():
    dump_file = find_latest_dump()
    size_mb = os.path.getsize(dump_file) / (1024 * 1024)
    print(f"Restoring from: {dump_file} ({size_mb:.1f} MB)")
    print(f"Target: {LOCAL_USER}@{LOCAL_HOST}:{LOCAL_PORT}/{LOCAL_DB}")
    print()

    env = os.environ.copy()
    env["PGPASSWORD"] = LOCAL_PASS

    # Ensure pgvector extension exists
    print("Ensuring pgvector extension...")
    subprocess.run([
        "psql", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
        "-U", LOCAL_USER, "-d", LOCAL_DB,
        "-c", "CREATE EXTENSION IF NOT EXISTS vector"
    ], env=env, capture_output=True)

    # Restore: gunzip | psql
    print("Restoring dump...")
    gunzip = subprocess.Popen(
        ["gunzip", "-c", dump_file],
        stdout=subprocess.PIPE,
    )
    psql = subprocess.Popen(
        ["psql", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
         "-U", LOCAL_USER, "-d", LOCAL_DB,
         "--single-transaction"],
        stdin=gunzip.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        text=True,
    )
    gunzip.stdout.close()
    stdout, stderr = psql.communicate()

    if psql.returncode != 0:
        print(f"WARNING: psql returned {psql.returncode}")
        if stderr:
            # Filter out harmless "does not exist" errors from --clean
            errors = [line for line in stderr.split("\n")
                     if line and "does not exist" not in line
                     and "NOTICE" not in line]
            if errors:
                print("Errors:")
                for line in errors[:20]:
                    print(f"  {line}")
    else:
        print("Restore completed successfully!")

    # Verify
    print("\nVerifying record counts...")
    tables = ["cg_hs_codes", "cg_fta_rates", "cg_regulations", "cg_document_chunks"]
    for table in tables:
        result = subprocess.run(
            ["psql", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
             "-U", LOCAL_USER, "-d", LOCAL_DB,
             "-t", "-c", f"SELECT COUNT(*) FROM {table}"],
            env=env, capture_output=True, text=True,
        )
        count = result.stdout.strip() if result.returncode == 0 else "ERROR"
        print(f"  {table}: {count} rows")

    print("\nDone! Local DB is ready.")


if __name__ == "__main__":
    main()
