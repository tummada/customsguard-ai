#!/bin/bash
# Script 13: Export knowledge base from Cloud SQL
#
# Usage: ./13_pg_dump.sh [DB_HOST] [DB_USER] [DB_NAME]
#
# Creates two dump files:
#   1. Binary (fast, compressed) — for pg_restore
#   2. SQL (human-readable) — for safety backup

set -euo pipefail

DB_HOST="${1:-${DB_HOST:-localhost}}"
DB_USER="${2:-${DB_USER:-postgres}}"
DB_NAME="${3:-${DB_NAME:-ai_saas_db}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="$(dirname "$0")/data/dumps"

mkdir -p "$OUTPUT_DIR"

echo "=============================================="
echo "  pg_dump — CustomsGuard Knowledge Base"
echo "=============================================="
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "DB:   $DB_NAME"
echo "Output: $OUTPUT_DIR"
echo ""

# Tables to export
TABLES="-t cg_hs_codes -t cg_fta_rates -t cg_regulations -t cg_document_chunks"

# 1. Binary dump (for pg_restore)
BINARY_FILE="$OUTPUT_DIR/customsguard_kb_${TIMESTAMP}.dump"
echo "1. Creating binary dump..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    $TABLES \
    --format=custom --compress=9 \
    -f "$BINARY_FILE"
echo "   Created: $BINARY_FILE ($(du -h "$BINARY_FILE" | cut -f1))"

# 2. SQL dump (human-readable backup)
SQL_FILE="$OUTPUT_DIR/customsguard_kb_${TIMESTAMP}.sql"
echo "2. Creating SQL dump..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    $TABLES \
    --inserts --column-inserts \
    -f "$SQL_FILE"
echo "   Created: $SQL_FILE ($(du -h "$SQL_FILE" | cut -f1))"

# 3. Record counts for verification
echo ""
echo "3. Record counts:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'cg_hs_codes' AS table_name, COUNT(*) FROM cg_hs_codes
    UNION ALL
    SELECT 'cg_fta_rates', COUNT(*) FROM cg_fta_rates
    UNION ALL
    SELECT 'cg_regulations', COUNT(*) FROM cg_regulations
    UNION ALL
    SELECT 'cg_document_chunks', COUNT(*) FROM cg_document_chunks;
"

# 4. Create a symlink to latest dump
ln -sf "$(basename "$BINARY_FILE")" "$OUTPUT_DIR/latest.dump"
ln -sf "$(basename "$SQL_FILE")" "$OUTPUT_DIR/latest.sql"

echo ""
echo "Done! Files:"
echo "  Binary: $BINARY_FILE"
echo "  SQL:    $SQL_FILE"
echo ""
echo "Restore with:"
echo "  pg_restore --data-only --no-owner -d $DB_NAME $BINARY_FILE"
