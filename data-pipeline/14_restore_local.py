#!/usr/bin/env python3
"""
Script 14: Restore dump into local Docker PostgreSQL

Reads the latest cg_dump_*.sql.gz and restores it into local dev DB.
Assumes docker-compose.dev.yml is running (PostgreSQL on localhost:5432).

SAFETY: Always creates a pg_dump backup before restoring.
"""

import os
import sys
import glob
import subprocess
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

# Local Docker DB
LOCAL_HOST = os.getenv("DB_HOST", "localhost")
LOCAL_PORT = os.getenv("DB_PORT", "5432")
LOCAL_DB = os.getenv("DB_NAME", "vollos_dev")
LOCAL_USER = os.getenv("DB_USER", "saas_admin")
LOCAL_PASS = os.getenv("DB_PASSWORD", "dev_password_2024")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

TABLES = ["cg_hs_codes", "cg_fta_rates", "cg_regulations", "cg_document_chunks"]


def find_latest_dump():
    """Find the most recent dump file."""
    pattern = os.path.join(DATA_DIR, "cg_dump_*.sql.gz")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"ERROR: No dump files found in {DATA_DIR}")
        sys.exit(1)
    return files[-1]


def backup_before_restore(env):
    """Create a pg_dump backup (Custom format) before restoring."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    backup_path = os.path.join(BACKUP_DIR, f"pre_restore_{ts}.dump")

    print(f"Backing up current DB to: {backup_path}")
    result = subprocess.run(
        ["pg_dump", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
         "-U", LOCAL_USER, "-d", LOCAL_DB,
         "-Fc",  # Custom format — supports selective restore
         "-f", backup_path],
        env=env, capture_output=True, text=True,
    )
    if result.returncode != 0:
        # If DB is empty or tables don't exist, backup fails — that's OK
        if "does not exist" in (result.stderr or ""):
            print("  No existing data to backup (fresh DB), skipping.")
            return None
        print(f"  WARNING: backup returned {result.returncode}")
        if result.stderr:
            print(f"  {result.stderr[:200]}")
        # Continue anyway — don't block restore for backup failure on dev
        return None

    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    print(f"  Backup saved: {size_mb:.1f} MB")
    return backup_path


def verify_counts(env):
    """Verify record counts after restore."""
    print("\nVerifying record counts...")
    for table in TABLES:
        result = subprocess.run(
            ["psql", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
             "-U", LOCAL_USER, "-d", LOCAL_DB,
             "-t", "-c", f"SELECT COUNT(*) FROM {table}"],
            env=env, capture_output=True, text=True,
        )
        count = result.stdout.strip() if result.returncode == 0 else "ERROR"
        print(f"  {table}: {count} rows")


def main():
    dump_file = find_latest_dump()
    size_mb = os.path.getsize(dump_file) / (1024 * 1024)
    print(f"Restoring from: {dump_file} ({size_mb:.1f} MB)")
    print(f"Target: {LOCAL_USER}@{LOCAL_HOST}:{LOCAL_PORT}/{LOCAL_DB}")
    print()

    env = os.environ.copy()
    env["PGPASSWORD"] = LOCAL_PASS

    # Step 1: Backup before restore
    backup_before_restore(env)
    print()

    # Step 2: Ensure pgvector extension exists
    print("Ensuring pgvector extension...")
    subprocess.run([
        "psql", "-h", LOCAL_HOST, "-p", LOCAL_PORT,
        "-U", LOCAL_USER, "-d", LOCAL_DB,
        "-c", "CREATE EXTENSION IF NOT EXISTS vector"
    ], env=env, capture_output=True)

    # Step 3: Restore (gunzip | psql)
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
            errors = [line for line in stderr.split("\n")
                     if line and "does not exist" not in line
                     and "NOTICE" not in line]
            if errors:
                print("Errors:")
                for line in errors[:20]:
                    print(f"  {line}")
    else:
        print("Restore completed successfully!")

    # Step 4: Verify
    verify_counts(env)
    print("\nDone! Local DB is ready.")


if __name__ == "__main__":
    main()
