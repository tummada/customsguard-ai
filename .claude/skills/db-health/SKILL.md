---
name: db-health
description: "ตรวจสุขภาพระบบ VOLLOS ทั้งหมด — DB records, migrations, API status. ใช้เมื่อผู้ใช้ถามเรื่อง health check, สุขภาพระบบ, หรือ ตรวจ DB"
user_invocable: true
---

# VOLLOS System Health Check

ตรวจสอบสุขภาพของระบบ VOLLOS ทั้งหมดแบบครบวงจร

## Think Before You Act

**ก่อนทำอะไร ให้แสดง execution plan:**

```
Execution Plan:
1. Query record counts ใน tables สำคัญ (MCP) → expect numbers
2. Query cg_scan_jobs by status (MCP) → expect status breakdown
3. Check flyway_schema_history (MCP) → expect 13 migrations
4. Check Docker containers status → expect 3 containers up
5. Test API endpoint (curl) → expect 200
ดำเนินการเลยไหม?
```

**รอผู้ใช้ตอบก่อนจึงเริ่มทำ**

## Health Checks to Perform

### 1. Database Record Counts (via MCP vollos-db)

Query ผ่าน MCP:
```sql
SELECT 'cg_hs_codes' as table_name, COUNT(*) as records FROM cg_hs_codes
UNION ALL
SELECT 'cg_scan_jobs', COUNT(*) FROM cg_scan_jobs
UNION ALL
SELECT 'cg_document_chunks', COUNT(*) FROM cg_document_chunks
UNION ALL
SELECT 'cg_fta_rates', COUNT(*) FROM cg_fta_rates;
```

### 2. Scan Jobs Status Breakdown (via MCP vollos-db)

```sql
SELECT status, COUNT(*) as count
FROM cg_scan_jobs
GROUP BY status
ORDER BY count DESC;
```

### 3. Flyway Migration Status (via MCP vollos-db)

```sql
SELECT version, description, success, installed_on
FROM flyway_schema_history
ORDER BY installed_rank;
```

Expected: 13 migrations (V1-V5 core + V1000-V1007 feature)

### 4. Embedding Coverage (via MCP vollos-db)

```sql
SELECT
  COUNT(*) as total_hs_codes,
  COUNT(embedding) as with_embedding,
  COUNT(*) - COUNT(embedding) as without_embedding
FROM cg_hs_codes;
```

### 5. Docker Container Status

```bash
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### 6. API Health Test

```bash
# ขอ token (ใช้ cached ถ้ามี)
TOKEN=$(cat /tmp/vollos-dev-token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/dev-token \
    -H "Content-Type: application/json" \
    -d '{"email":"dev@vollos.io","tenantId":"a0000000-0000-0000-0000-000000000001"}' \
    | jq -r '.token')
  echo "$TOKEN" > /tmp/vollos-dev-token
fi

# ทดสอบ API
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" \
  http://localhost:8080/v1/customsguard/hs-codes
```

## Output Format

แสดงผลเป็นรายงาน markdown:

```markdown
# VOLLOS Health Report
📅 Generated: 2026-03-03 14:30:22

## Database Records
| Table | Records | Status |
|-------|---------|--------|
| cg_hs_codes | 21 | OK |
| cg_scan_jobs | 3 | OK |
| cg_document_chunks | 0 | Warning (empty) |
| cg_fta_rates | 15 | OK |

## Embedding Coverage
| Metric | Value |
|--------|-------|
| Total HS Codes | 21 |
| With Embedding | 21 |
| Without Embedding | 0 |
| Coverage | 100% |

## Scan Jobs
| Status | Count |
|--------|-------|
| COMPLETED | 2 |
| PENDING | 1 |

## Flyway Migrations
Total: 13 | All successful: Yes

## Infrastructure
| Container | Status |
|-----------|--------|
| saas-db | Up (healthy) |
| saas-redis | Up (healthy) |
| saas-minio | Up (healthy) |

## API Status
| Endpoint | Status |
|----------|--------|
| GET /v1/customsguard/hs-codes | 200 OK |

## Overall: HEALTHY / WARNING / CRITICAL
```

## Activity Logging (Iron Rule #1)

หลังจากรันเสร็จ เขียน log:
```bash
echo "[$(date '+%Y-%m-%d %H:%M:%S')] /db-health → cg_hs_codes: N, cg_scan_jobs: N, migrations: N, status: HEALTHY" \
  >> /home/ipon/workspace/aiservice/.claude/logs/activity.log
```
