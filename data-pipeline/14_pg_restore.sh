#!/bin/bash
# Script 14: Restore knowledge base into local Docker PostgreSQL
#
# Usage: ./14_pg_restore.sh [DUMP_FILE]
#
# If no dump file specified, uses data/dumps/latest.dump

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-ai_saas_db}"

DUMP_FILE="${1:-$(dirname "$0")/data/dumps/latest.dump}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: Dump file not found: $DUMP_FILE"
    echo "Usage: $0 [dump_file.dump]"
    exit 1
fi

echo "=============================================="
echo "  pg_restore — CustomsGuard Knowledge Base"
echo "=============================================="
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "DB:   $DB_NAME"
echo "Dump: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
echo ""

read -p "This will TRUNCATE existing data. Continue? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# 1. Truncate existing data (order matters for FK constraints)
echo "1. Truncating existing data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    TRUNCATE cg_document_chunks, cg_fta_rates, cg_regulations, cg_hs_codes CASCADE;
"

# 2. Restore from dump
echo "2. Restoring from dump..."
pg_restore --data-only --no-owner \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    "$DUMP_FILE"

# 3. Rebuild indexes
echo "3. Rebuilding indexes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    REINDEX TABLE cg_hs_codes;
    REINDEX TABLE cg_fta_rates;
    REINDEX TABLE cg_regulations;
    REINDEX TABLE cg_document_chunks;
"

# 4. VACUUM
echo "4. VACUUM ANALYZE..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    VACUUM (ANALYZE) cg_hs_codes;
    VACUUM (ANALYZE) cg_fta_rates;
    VACUUM (ANALYZE) cg_regulations;
    VACUUM (ANALYZE) cg_document_chunks;
"

# 5. Verify counts
echo ""
echo "5. Record counts after restore:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'cg_hs_codes' AS table_name, COUNT(*) FROM cg_hs_codes
    UNION ALL
    SELECT 'cg_fta_rates', COUNT(*) FROM cg_fta_rates
    UNION ALL
    SELECT 'cg_regulations', COUNT(*) FROM cg_regulations
    UNION ALL
    SELECT 'cg_document_chunks', COUNT(*) FROM cg_document_chunks;
"

# 6. Verify provenance
echo "6. Provenance check:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'cg_fta_rates with source_url', COUNT(*) FROM cg_fta_rates WHERE source_url IS NOT NULL
    UNION ALL
    SELECT 'cg_regulations with source_url', COUNT(*) FROM cg_regulations WHERE source_url IS NOT NULL;
"

echo ""
echo "Done! Knowledge base restored successfully."
echo ""
echo "Test endpoints:"
echo "  curl localhost:8080/v1/customsguard/hs-codes"
echo "  curl -X POST localhost:8080/v1/customsguard/rag/search -H 'Content-Type: application/json' -d '{\"query\":\"นำเข้ารถยนต์ไฟฟ้า\",\"limit\":5}'"
