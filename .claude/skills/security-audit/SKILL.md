---
name: security-audit
description: ตรวจ security ของ code/config (JWT, RLS, PII, S3, CORS, rate limiting)
user_invocable: true
argument: "<scope> — 'auth', 'api', 'db', 'infra', หรือ 'all' (default: all)"
---

# /security-audit — Security Audit

ตรวจสอบความปลอดภัยของระบบ VOLLOS ตามมาตรฐาน Zero-Trust สำหรับ AI-SaaS

## Execution Steps

1. **รับ scope:** อ่าน `$ARGUMENTS` — ถ้าไม่ระบุ ใช้ `all`
2. **ตรวจตาม scope** ที่เลือก (ดู sections ด้านล่าง)
3. **ให้คะแนน scorecard** แล้วรายงานผล

## Scope: auth (Identity & Access)

ใช้ Grep ค้นหา patterns:

| # | Check | Search Pattern | Severity |
|---|-------|---------------|----------|
| A1 | **JWT Algorithm** | `"HS256"` หรือ `"HS384"` ใน security config — ควรเป็น RS256 | HIGH |
| A2 | **Tenant Binding** | `X-Tenant-ID` ต้องถูกตรวจสอบกับ JWT claims | CRITICAL |
| A3 | **Hard-coded Secrets** | Grep: `"secret"`, `"password"`, `"api.key"` ใน `.java`, `.yml`, `.properties` (ยกเว้น test/) | CRITICAL |
| A4 | **Token Expiry** | JWT expiry ต้อง ≤ 24h | MEDIUM |
| A5 | **CORS Config** | ตรวจว่าไม่ใช่ `allowedOrigins("*")` ใน production | HIGH |

## Scope: api (Data & API Safety)

| # | Check | Search Pattern | Severity |
|---|-------|---------------|----------|
| B1 | **PII Logging** | Grep: `log.*(email|phone|password|creditCard)` ใน `.java` | HIGH |
| B2 | **No SELECT \*** | Grep: `SELECT \*` ใน `.java`, `.sql` | MEDIUM |
| B3 | **Input Validation** | Controller methods ต้องมี `@Valid` หรือ validation | MEDIUM |
| B4 | **Error Exposure** | ตรวจว่าไม่ส่ง stack trace ไปให้ client (มี global exception handler) | HIGH |
| B5 | **Idempotency** | Financial/credit APIs ควรรับ `X-Idempotency-Key` | LOW |

## Scope: db (Database Hardening)

| # | Check | Search Pattern | Severity |
|---|-------|---------------|----------|
| C1 | **RLS Enabled** | Migration files ต้องมี `CREATE POLICY` + `ENABLE ROW LEVEL SECURITY` | CRITICAL |
| C2 | **SET LOCAL** | Tenant ID ต้องตั้งค่าด้วย `SET LOCAL` (ไม่ใช่ `SET`) | CRITICAL |
| C3 | **Audit Table** | ตรวจว่ามี audit_logs table หรือ outbox_events | MEDIUM |
| C4 | **DB User Permissions** | init-db.sh ควรมีการ GRANT/REVOKE ที่เหมาะสม | LOW |

## Scope: infra (Infrastructure & Network)

| # | Check | Search Pattern | Severity |
|---|-------|---------------|----------|
| D1 | **S3 Presigned TTL** | Presigned URL TTL ต้อง ≤ 60 นาที | MEDIUM |
| D2 | **Rate Limiting** | nginx config ต้องมี `limit_req` | HIGH |
| D3 | **Secret in docker-compose** | ตรวจว่าไม่มี plain-text secrets ใน docker-compose.yml | CRITICAL |
| D4 | **Health Checks** | Docker services ต้องมี healthcheck config | MEDIUM |
| D5 | **Log Limits** | Docker logging ต้องมี `max-size` + `max-file` | LOW |

## Output Format

```
## 🛡️ Security Audit Report

Scope: <scope> | Date: <today>

### Auth (Identity & Access)
| # | Check | Status | Detail |
|---|-------|--------|--------|
| A1 | JWT Algorithm | ⚠️ WARN | ใช้ HS256 (dev OK, prod ต้องเปลี่ยน RS256) |
| ... | ... | ... | ... |

### Scorecard
| Category | Score | Max |
|----------|-------|-----|
| Auth | 3/5 | 5 |
| API | 4/5 | 5 |
| DB | 5/5 | 5 |
| Infra | 2/5 | 5 |
| **Total** | **14/20** | **20** |

### Critical Findings
1. ❌ [A2] Tenant binding not verified — file:line
2. ❌ [D3] Plain-text DB password in docker-compose.yml:15

### Recommendations
- ...
```

## Important Notes
- `scope=all` → ตรวจทุก category
- dev-only patterns (เช่น permitAll, HS256 in dev) → แจ้งเป็น ⚠️ WARN ไม่ใช่ ❌ FAIL
- อ้างอิง file:line เสมอ
- ใช้ Grep tool (ไม่ใช่ bash grep) สำหรับทุกการค้นหา
