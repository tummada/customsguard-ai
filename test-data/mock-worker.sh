#!/usr/bin/env bash
# =============================================================
# Mock Worker Script — simulates n8n processing a scan job
# Usage: bash test-data/mock-worker.sh [job_id]
#
# If no job_id is provided, picks the oldest CREATED job.
# Updates ai_jobs → COMPLETED and cg_declarations.items with mock data.
# Runs psql inside the Docker container.
# =============================================================

set -euo pipefail

CONTAINER="${DB_CONTAINER:-saas-db}"
DB_NAME="${DB_NAME:-ai_saas_db}"
DB_USER="${DB_USER:-saas_admin}"
TENANT_ID="a0000000-0000-0000-0000-000000000001"

PSQL="docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -t -A"

if [ -n "${1:-}" ]; then
    JOB_ID="$1"
    echo "Using provided job ID: $JOB_ID"
else
    # Find the oldest CREATED scan job
    JOB_ID=$($PSQL -c "
        SELECT id FROM ai_jobs
        WHERE status = 'CREATED'
        AND model_type = 'customsguard-scan'
        AND tenant_id = '$TENANT_ID'
        ORDER BY created_at ASC
        LIMIT 1
    " | head -1 | tr -d '[:space:]')

    if [ -z "$JOB_ID" ]; then
        echo "No CREATED scan jobs found. Trying PROCESSING..."
        JOB_ID=$($PSQL -c "
            SELECT id FROM ai_jobs
            WHERE status = 'PROCESSING'
            AND model_type = 'customsguard-scan'
            AND tenant_id = '$TENANT_ID'
            ORDER BY created_at ASC
            LIMIT 1
        " | head -1 | tr -d '[:space:]')
    fi

    if [ -z "$JOB_ID" ]; then
        echo "No pending scan jobs found."
        echo "Upload a PDF first: curl -X POST localhost:8080/v1/customsguard/scan ..."
        exit 1
    fi

    echo "Found job: $JOB_ID"
fi

# Mock extracted items JSON (inline, escaped for shell)
ITEMS_JSON='[{"hsCode":"1006.30","descriptionTh":"ข้าวกึ่งขาวหรือข้าวขาว","descriptionEn":"Semi-milled rice 5% broken","quantity":"500","weight":"25000 KG","unitPrice":"120.00","cifPrice":"60000.00","currency":"USD","confidence":0.95,"aiReason":"Matched HS 1006.30 based on description: semi-milled rice","sourcePageIndex":0},{"hsCode":"0306.17","descriptionTh":"กุ้งแช่แข็ง","descriptionEn":"Frozen shrimps HOSO 16/20","quantity":"200","weight":"4000 KG","unitPrice":"350.00","cifPrice":"70000.00","currency":"USD","confidence":0.92,"aiReason":"Matched HS 0306.17 for frozen shrimps and prawns","sourcePageIndex":0},{"hsCode":"8471.30","descriptionTh":"เครื่องคอมพิวเตอร์พกพา","descriptionEn":"Laptop Dell Latitude 15 inch","quantity":"50","weight":"100 KG","unitPrice":"25000.00","cifPrice":"1250000.00","currency":"USD","confidence":0.88,"aiReason":"Portable automatic data-processing machine","sourcePageIndex":0},{"hsCode":"4011.10","descriptionTh":"ยางรถยนต์นั่ง","descriptionEn":"Pneumatic tyres radial 205/55R16","quantity":"100","weight":"800 KG","unitPrice":"2500.00","cifPrice":"250000.00","currency":"USD","confidence":0.72,"aiReason":"New pneumatic tyres of rubber","sourcePageIndex":0},{"hsCode":"0207.14","descriptionTh":"ชิ้นส่วนไก่แช่แข็ง","descriptionEn":"Frozen chicken cuts boneless","quantity":"300","weight":"6000 KG","unitPrice":"180.00","cifPrice":"54000.00","currency":"USD","confidence":0.60,"aiReason":"Frozen chicken parts","sourcePageIndex":0}]'

echo "Updating job $JOB_ID → PROCESSING..."
$PSQL -c "
    SELECT set_config('app.current_tenant_id', '$TENANT_ID', true);
    UPDATE ai_jobs SET status = 'PROCESSING', progress = 50, updated_at = NOW()
    WHERE id = '$JOB_ID';
" > /dev/null

sleep 1

echo "Updating job $JOB_ID → COMPLETED..."
$PSQL -c "
    SELECT set_config('app.current_tenant_id', '$TENANT_ID', true);
    UPDATE ai_jobs SET status = 'COMPLETED', progress = 100, updated_at = NOW()
    WHERE id = '$JOB_ID';
" > /dev/null

echo "Updating declaration items..."
$PSQL -c "
    SELECT set_config('app.current_tenant_id', '$TENANT_ID', true);
    UPDATE cg_declarations SET
        items = '${ITEMS_JSON}'::jsonb,
        status = 'COMPLETED',
        updated_at = NOW()
    WHERE ai_job_id = '$JOB_ID';
" > /dev/null

echo ""
echo "Done! Job $JOB_ID is now COMPLETED with 5 extracted items."
echo ""
echo "Verify with:"
echo "  curl -s localhost:8080/v1/customsguard/scan/$JOB_ID \\"
echo "    -H 'Authorization: Bearer \$TOKEN' \\"
echo "    -H 'X-Tenant-ID: $TENANT_ID' | python3 -m json.tool"
