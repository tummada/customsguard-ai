---
name: review-db
description: ตรวจ SQL migration/schema ตามมาตรฐาน VOLLOS (RLS, UUID v7, index quota)
user_invocable: true
argument: "<file-path or table-name> — ชื่อไฟล์ migration (.sql) หรือ entity (.java) ที่ต้องการตรวจ"
---

# /review-db — Database Design Review

ตรวจสอบ SQL migration, entity class, หรือ schema ตามมาตรฐานสถาปัตยกรรม VOLLOS (8GB RAM Optimized)

## Execution Steps

1. **รับ input:** อ่าน `$ARGUMENTS` — ถ้าเป็นไฟล์ path ให้ Read ไฟล์นั้น, ถ้าเป็นชื่อตาราง ให้ใช้ MCP query `\d <table>` หรือค้นหา migration ที่เกี่ยวข้อง
2. **ถ้าไม่มี argument:** ค้นหา migration ไฟล์ล่าสุดที่แก้ไข ด้วย `Glob` pattern `**/db/**/V*.sql`
3. **ตรวจ checklist** ทุกข้อด้านล่าง แล้วรายงานผลเป็นตาราง

## Checklist

| # | Rule | ตรวจอะไร | Severity |
|---|------|---------|----------|
| 1 | **RLS Policy** | ตาราง tenant-owned ต้องมี `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)` | CRITICAL |
| 2 | **tenant_id Column** | ตารางที่เกี่ยวกับข้อมูลลูกค้าต้องมี `tenant_id UUID NOT NULL` | CRITICAL |
| 3 | **UUID v7 PK** | Primary key ต้องเป็น UUID (ห้ามใช้ SERIAL/BIGSERIAL) | HIGH |
| 4 | **TIMESTAMPTZ** | Timestamp columns ต้องใช้ `TIMESTAMPTZ` (ไม่ใช่ `TIMESTAMP`) | HIGH |
| 5 | **Index Quota** | จำนวน index ต่อตาราง ≤ 5 (รวม PK) | MEDIUM |
| 6 | **Partial Index** | Index ที่ filter active data ควรใช้ `WHERE` clause | INFO |
| 7 | **No SELECT \*** | ห้ามใช้ `SELECT *` ใน migration (views, functions) | MEDIUM |
| 8 | **Composite Index** | Index ที่ใช้กับ tenant data ควรขึ้นต้นด้วย `tenant_id` | MEDIUM |
| 9 | **Efficient Types** | ใช้ SMALLINT แทน INTEGER สำหรับ percentage/status, BOOLEAN แทน string | LOW |
| 10 | **Feature Prefix** | ตารางของ feature module ต้องมี prefix (เช่น `cg_` สำหรับ CustomsGuard) | MEDIUM |

## สำหรับ Entity (.java) ตรวจเพิ่ม

| # | Rule | ตรวจอะไร | Severity |
|---|------|---------|----------|
| E1 | **No GenerationType.AUTO** | ห้ามใช้ `@GeneratedValue(strategy = GenerationType.AUTO)` — ต้องสร้าง UUID v7 จาก app | HIGH |
| E2 | **tenant_id field** | Entity ที่เป็น tenant-owned ต้องมี field `tenantId` | CRITICAL |
| E3 | **Audit fields** | ต้องมี `createdAt`, `updatedAt` | MEDIUM |

## Output Format

```
## 📋 Database Review: <filename>

| # | Rule | Status | Note |
|---|------|--------|------|
| 1 | RLS Policy | ✅ PASS | ... |
| 2 | tenant_id | ❌ FAIL | ขาด tenant_id column |
| ... | ... | ... | ... |

### Summary
- ✅ Passed: X/Y
- ❌ Failed: Z items (X critical)
- 💡 Suggestions: ...
```

## Important Notes
- ถ้าพบ CRITICAL fail → แจ้งเตือนชัดเจนว่า **ห้าม merge**
- ถ้าเป็น global/system table (ไม่ใช่ tenant-owned) → skip RLS + tenant_id checks
- อ้างอิง line numbers เสมอ
