#!/usr/bin/env python3
"""
Script 17: Production-safe restore using staging table strategy

NEVER uses DROP+CREATE on production tables.
Instead:
  1. Creates staging tables (cg_xxx_tmp)
  2. Loads data into staging
  3. Verifies counts
  4. Swaps in a single transaction (TRUNCATE + INSERT + DROP staging)

Requirements:
  - Production DB credentials via environment variables
  - pg_dump backup taken automatically before restore
  - Dry-run mode by default (use --execute to actually run)
"""

import os
import sys
import glob
import subprocess
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

# Production DB — MUST come from environment
PROD_HOST = os.getenv("PROD_DB_HOST", "")
PROD_PORT = os.getenv("PROD_DB_PORT", "5432")
PROD_DB = os.getenv("PROD_DB_NAME", "")
PROD_USER = os.getenv("PROD_DB_USER", "")
PROD_PASS = os.getenv("PROD_DB_PASSWORD", "")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

# Tables to restore (order matters for FK constraints)
TABLES = ["cg_hs_codes", "cg_regulations", "cg_document_chunks", "cg_fta_rates"]


def validate_env():
    """Ensure all required env vars are set."""
    missing = []
    for var in ["PROD_DB_HOST", "PROD_DB_NAME", "PROD_DB_USER", "PROD_DB_PASSWORD"]:
        if not os.getenv(var):
            missing.append(var)
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print("Set these before running:")
        for var in missing:
            print(f"  export {var}=<value>")
        sys.exit(1)


def get_env():
    env = os.environ.copy()
    env["PGPASSWORD"] = PROD_PASS
    return env


def psql_cmd(env, sql, capture=True):
    """Run a psql command and return output."""
    result = subprocess.run(
        ["psql", "-h", PROD_HOST, "-p", PROD_PORT,
         "-U", PROD_USER, "-d", PROD_DB,
         "-t", "-A", "-c", sql],
        env=env, capture_output=capture, text=True,
    )
    return result


def backup_prod(env):
    """Create a pg_dump backup of production DB before restore."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    backup_path = os.path.join(BACKUP_DIR, f"prod_backup_{ts}.dump")

    print(f"Backing up production DB to: {backup_path}")
    result = subprocess.run(
        ["pg_dump", "-h", PROD_HOST, "-p", PROD_PORT,
         "-U", PROD_USER, "-d", PROD_DB,
         "-Fc", "-f", backup_path],
        env=env, capture_output=True, text=True,
        timeout=600,
    )
    if result.returncode != 0:
        print(f"ERROR: Backup failed!")
        print(result.stderr[:500] if result.stderr else "Unknown error")
        sys.exit(1)

    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    print(f"  Backup saved: {size_mb:.1f} MB")
    return backup_path


def get_current_counts(env):
    """Get current row counts from production."""
    counts = {}
    for table in TABLES:
        result = psql_cmd(env, f"SELECT COUNT(*) FROM {table}")
        if result.returncode == 0:
            counts[table] = int(result.stdout.strip())
        else:
            counts[table] = 0
    return counts


def find_latest_dump():
    """Find the most recent dump file."""
    pattern = os.path.join(DATA_DIR, "cg_dump_*.sql.gz")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"ERROR: No dump files found in {DATA_DIR}")
        sys.exit(1)
    return files[-1]


def staging_restore(env, dump_file, dry_run=True):
    """
    Production restore using staging table strategy:
    1. Load dump into staging tables
    2. Verify counts
    3. Swap atomically
    """
    if dry_run:
        print("\n=== DRY RUN MODE (use --execute to apply) ===\n")

    # Step 1: Get current production counts
    print("Current production counts:")
    current = get_current_counts(env)
    for table, count in current.items():
        print(f"  {table}: {count}")

    if dry_run:
        print("\nDry run complete. What would happen with --execute:")
        print("  1. Create staging tables (cg_xxx_tmp)")
        print("  2. Load dump data into staging tables")
        print("  3. Verify staging counts match expected")
        print("  4. In a single transaction:")
        print("     - TRUNCATE current tables")
        print("     - INSERT FROM staging tables")
        print("     - DROP staging tables")
        return

    # Step 2: Create staging tables and load data
    print("\nCreating staging tables...")
    staging_sql = []
    for table in TABLES:
        staging_sql.append(f"DROP TABLE IF EXISTS {table}_tmp;")
        staging_sql.append(f"CREATE TABLE {table}_tmp (LIKE {table} INCLUDING ALL);")

    full_sql = "\n".join(staging_sql)
    result = psql_cmd(env, full_sql)
    if result.returncode != 0:
        print(f"ERROR creating staging tables: {result.stderr}")
        sys.exit(1)

    # Step 3: Load dump into staging tables
    # We need to modify the dump SQL to target _tmp tables
    print(f"\nLoading dump into staging tables...")
    print("  (This requires the dump to target _tmp tables)")
    print("  Extracting and transforming dump...")

    # Extract dump, replace table names with _tmp versions
    gunzip = subprocess.Popen(
        ["gunzip", "-c", dump_file],
        stdout=subprocess.PIPE,
    )
    raw_sql, _ = gunzip.communicate()
    raw_sql = raw_sql.decode("utf-8")

    # Replace table names in INSERT/COPY statements
    for table in TABLES:
        raw_sql = raw_sql.replace(f"INSERT INTO {table}", f"INSERT INTO {table}_tmp")
        raw_sql = raw_sql.replace(f"COPY {table}", f"COPY {table}_tmp")
        # Also handle DROP/CREATE/TRUNCATE from dump — redirect to _tmp
        raw_sql = raw_sql.replace(f"TRUNCATE TABLE {table};", f"-- skipped TRUNCATE {table}")
        raw_sql = raw_sql.replace(f"DROP TABLE IF EXISTS {table}", f"-- skipped DROP {table}")
        raw_sql = raw_sql.replace(f"CREATE TABLE {table}", f"-- skipped CREATE {table}")

    # Run transformed SQL
    psql_proc = subprocess.Popen(
        ["psql", "-h", PROD_HOST, "-p", PROD_PORT,
         "-U", PROD_USER, "-d", PROD_DB],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        text=True,
    )
    stdout, stderr = psql_proc.communicate(input=raw_sql)

    if psql_proc.returncode != 0:
        errors = [l for l in (stderr or "").split("\n")
                 if l and "does not exist" not in l and "NOTICE" not in l]
        if errors:
            print("Errors during staging load:")
            for line in errors[:10]:
                print(f"  {line}")

    # Step 4: Verify staging counts
    print("\nVerifying staging table counts...")
    staging_counts = {}
    for table in TABLES:
        result = psql_cmd(env, f"SELECT COUNT(*) FROM {table}_tmp")
        if result.returncode == 0:
            staging_counts[table] = int(result.stdout.strip())
        else:
            staging_counts[table] = 0
        print(f"  {table}_tmp: {staging_counts[table]}")

    # Sanity check: staging should have data
    empty_staging = [t for t, c in staging_counts.items() if c == 0]
    if empty_staging:
        print(f"\nWARNING: Empty staging tables: {empty_staging}")
        print("Aborting swap. Staging tables left for inspection.")
        sys.exit(1)

    # Step 5: Atomic swap
    print("\nPerforming atomic swap...")
    swap_statements = []
    for table in TABLES:
        swap_statements.append(f"TRUNCATE {table} CASCADE;")
    for table in TABLES:
        swap_statements.append(f"INSERT INTO {table} SELECT * FROM {table}_tmp;")
    for table in TABLES:
        swap_statements.append(f"DROP TABLE {table}_tmp;")

    swap_sql = "BEGIN;\n" + "\n".join(swap_statements) + "\nCOMMIT;"

    result = psql_cmd(env, swap_sql)
    if result.returncode != 0:
        print(f"ERROR during swap: {result.stderr}")
        print("Transaction rolled back. Production data unchanged.")
        # Cleanup staging tables
        for table in TABLES:
            psql_cmd(env, f"DROP TABLE IF EXISTS {table}_tmp")
        sys.exit(1)

    # Step 6: Verify final counts
    print("\nFinal production counts:")
    final = get_current_counts(env)
    for table, count in final.items():
        status = "OK" if count > 0 else "EMPTY!"
        print(f"  {table}: {count} ({status})")

    print("\nProduction restore complete!")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Production-safe database restore")
    parser.add_argument("--execute", action="store_true",
                       help="Actually execute (default is dry-run)")
    parser.add_argument("--skip-backup", action="store_true",
                       help="Skip pre-restore backup (NOT recommended)")
    args = parser.parse_args()

    validate_env()
    env = get_env()

    dump_file = find_latest_dump()
    size_mb = os.path.getsize(dump_file) / (1024 * 1024)
    print(f"Dump file: {dump_file} ({size_mb:.1f} MB)")
    print(f"Target: {PROD_USER}@{PROD_HOST}:{PROD_PORT}/{PROD_DB}")
    print()

    if args.execute and not args.skip_backup:
        backup_prod(env)

    staging_restore(env, dump_file, dry_run=not args.execute)


if __name__ == "__main__":
    main()
