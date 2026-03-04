---
name: vollos-api-test
description: "ทดสอบ VOLLOS API อัตโนมัติ — ขอ token, retry on 401, วิเคราะห์ response. ใช้เมื่อผู้ใช้ต้องการทดสอบ API endpoint"
user_invocable: true
---

# VOLLOS API Tester — Stateful Autonomous Skill

คุณคือ **QA Engineer** ที่ทดสอบ VOLLOS API อย่างอัตโนมัติ

## Arguments

`$ARGUMENTS` = API endpoint หรือคำสั่ง เช่น:
- `hs-codes` → GET /v1/customsguard/hs-codes
- `scan` → GET recent scan jobs
- `seed` → POST /v1/customsguard/hs-codes/seed
- `semantic <query>` → POST /v1/customsguard/hs-codes/semantic
- `rag <query>` → POST /v1/customsguard/rag/search
- `health` → ตรวจสอบ backend health
- ถ้าว่าง → แสดงรายการ endpoints ทั้งหมดให้เลือก

## Endpoint Map

| Shortcut | Method | Full Path |
|----------|--------|-----------|
| hs-codes | GET | /v1/customsguard/hs-codes |
| seed | POST | /v1/customsguard/hs-codes/seed |
| embed-all | POST | /v1/customsguard/hs-codes/embed-all |
| semantic | POST | /v1/customsguard/hs-codes/semantic |
| lookup | POST | /v1/customsguard/hs/lookup |
| scan | POST | /v1/customsguard/scan |
| scan-status | GET | /v1/customsguard/scan/{jobId} |
| rag | POST | /v1/customsguard/rag/search |
| rag-stream | POST | /v1/customsguard/rag/stream |

## Step 1: Token Management (Stateful Cache + TTL)

ก่อนเรียก API ต้องมี JWT token:

### ตรวจสอบ cached token:
```bash
# เช็คว่ามี cached token และยังไม่หมดอายุ (TTL = 1 ชม.)
FILE_AGE=$(( $(date +%s) - $(stat -c %Y /tmp/vollos-dev-token 2>/dev/null || echo 0) ))
if [ $FILE_AGE -gt 3600 ]; then
  rm -f /tmp/vollos-dev-token
fi
```

### ถ้าไม่มี cached token หรือหมดอายุ:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/dev-token \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@vollos.io","tenantId":"a0000000-0000-0000-0000-000000000001"}' \
  | jq -r '.token')
echo "$TOKEN" > /tmp/vollos-dev-token
```

### ถ้ามี cached token:
```bash
TOKEN=$(cat /tmp/vollos-dev-token)
```

## Step 2: เรียก API

ใส่ headers ทุกครั้ง:
```bash
curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  http://localhost:8080/<endpoint>
```

## Step 3: Autonomous Error Handling

### 401 Unauthorized:
1. ลบ cached token: `rm -f /tmp/vollos-dev-token`
2. ขอ token ใหม่ (Step 1)
3. บันทึก token ใหม่ลงไฟล์
4. **Retry request อัตโนมัติ** (ไม่ต้องถามผู้ใช้)

### 500 Internal Server Error:
1. อ่าน response body
2. วิเคราะห์สาเหตุจาก error message
3. แนะนำวิธีแก้ไข

### Connection Refused:
1. แจ้งว่า backend ไม่ได้รัน
2. แนะนำ: `cd backend-core && ./gradlew :platform-app:bootRun`
3. ตรวจสอบว่า Docker dev stack รันอยู่: `docker compose -f docker-compose.dev.yml ps`

### 403 Forbidden:
1. ตรวจสอบ X-Tenant-ID header
2. ตรวจสอบว่า token ยังใช้ได้

## Step 4: Skeleton Response (ประหยัด Token)

เมื่อได้ response กลับมา **กรองก่อนแสดง**:

### ถ้า JSON response > 50 บรรทัด:
```bash
# ดูแค่ keys + array lengths
curl ... | jq '{keys: keys, itemCount: (if type == "array" then length else "object" end)}'

# หรือถ้าเป็น array:
curl ... | jq '{totalItems: length, firstItem: .[0], lastItem: .[-1]}'
```

### ถ้ามี error:
```bash
curl ... | jq '{error: .error, message: .message, status: .status}'
```

### ถ้า response สั้น (< 50 บรรทัด):
แสดงผลทั้งหมดได้เลย

## Step 5: Activity Logging (Iron Rule #1)

หลังทุก API call ให้เขียน log:
```bash
echo "[$(date '+%Y-%m-%d %H:%M:%S')] /vollos-api-test $ARGUMENTS → $HTTP_STATUS ($SUMMARY)" \
  >> /home/ipon/workspace/aiservice/.claude/logs/activity.log
```

ตัวอย่าง log entries:
```
[2026-03-03 14:30:22] /vollos-api-test hs-codes → 200 OK (21 items, cached token)
[2026-03-03 14:31:05] /vollos-api-test scan → 401 → token refreshed → retry → 200 OK
[2026-03-03 14:32:00] /vollos-api-test semantic shrimp → 200 OK (5 results)
```

## Sensitive Data Handling

- **ห้าม hardcode credentials** ในคำสั่ง curl
- ดึง secrets จาก environment: `$DB_PASSWORD`, `$GEMINI_API_KEY`
- Token ถูกเก็บใน `/tmp/vollos-dev-token` (ไม่ commit ลง git)

## Output Format

แสดงผลสรุปแบบนี้:
```
## API Test Result

| Field | Value |
|-------|-------|
| Endpoint | GET /v1/customsguard/hs-codes |
| Status | 200 OK |
| Token | Cached (age: 23 min) |
| Response | 21 items |
| Time | 0.045s |

### Response Summary
(skeleton response หรือ full response ถ้าสั้น)
```
