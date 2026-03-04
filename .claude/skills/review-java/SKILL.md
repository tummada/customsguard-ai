---
name: review-java
description: ตรวจ Java code ตามมาตรฐาน VOLLOS (Virtual Threads, HikariCP, GraalVM, UUID v7)
user_invocable: true
argument: "<file-path or package> — path ของ Java file หรือ package ที่ต้องการตรวจ"
---

# /review-java — Java Backend Code Review

ตรวจสอบ Java code ตามมาตรฐาน Spring Boot 3.5 + Java 21 + GraalVM สำหรับ VOLLOS (1GB backend heap)

## Execution Steps

1. **รับ input:** อ่าน `$ARGUMENTS` — ถ้าเป็นไฟล์ ให้ Read, ถ้าเป็น package ให้ Glob `**/<package>/**/*.java`
2. **ถ้าไม่มี argument:** ค้นหาไฟล์ Java ที่แก้ไขล่าสุด (`git diff --name-only HEAD~3 -- '*.java'`)
3. **ตรวจ checklist** ทุกข้อด้านล่าง → รายงานผลพร้อม fix suggestions

## Checklist

| # | Rule | ตรวจอะไร | Severity |
|---|------|---------|----------|
| 1 | **No synchronized** | ห้ามใช้ `synchronized` ใน service/repository layer — ต้องใช้ `ReentrantLock` (Virtual Thread pinning) | CRITICAL |
| 2 | **UUID v7 Generation** | ห้ามใช้ `GenerationType.AUTO` หรือ `GenerationType.IDENTITY` — ต้องสร้าง UUID v7 จาก app layer | HIGH |
| 3 | **HikariCP Leak Detection** | ถ้ามี datasource config ต้องเปิด `leak-detection-threshold` | HIGH |
| 4 | **202 Accepted Pattern** | Long-running operations (AI, embedding) ต้อง return `202 Accepted` + Job ID | MEDIUM |
| 5 | **Graceful Shutdown** | ต้องมี `spring.lifecycle.timeout-per-shutdown-phase` config | LOW |
| 6 | **Jackson Blackbird** | ควรใช้ `jackson-module-blackbird` แทน afterburner (GraalVM compatible) | LOW |
| 7 | **RuntimeHintsRegistrar** | Libraries ที่ใช้ reflection ต้อง register hints สำหรับ GraalVM | MEDIUM |
| 8 | **Transaction Scope** | `SET LOCAL app.current_tenant_id` ต้องอยู่ใน `@Transactional` scope | CRITICAL |
| 9 | **No Thread.sleep** | ห้ามใช้ `Thread.sleep()` ใน production code (block virtual thread) | MEDIUM |
| 10 | **Resource Limits** | Heap ต้องไม่เกิน 512MB (`-Xmx512m`) สำหรับ production | HIGH |

## Grep Patterns to Search

```
# Virtual Thread pinning
pattern: "synchronized\s*\(" or "synchronized\s+\w+\s*\{"
files: **/*.java (exclude test/)

# Bad ID generation
pattern: "GenerationType\.(AUTO|IDENTITY)"
files: **/*.java

# Thread.sleep in production
pattern: "Thread\.sleep"
files: **/*.java (exclude test/)
```

## Output Format

```
## 📋 Java Review: <filename>

| # | Rule | Status | Location | Fix |
|---|------|--------|----------|-----|
| 1 | No synchronized | ❌ FAIL | Line 45 | เปลี่ยนเป็น ReentrantLock |
| 2 | UUID v7 | ✅ PASS | — | — |
| ... | ... | ... | ... | ... |

### Summary
- ✅ Passed: X/Y
- ❌ Failed: Z items
- 🔧 Fix suggestions provided above
```

## Important Notes
- ถ้าตรวจ package → รายงานแยกตามไฟล์
- อ้างอิง `file:line_number` เสมอ
- `synchronized` ใน test code → ไม่นับ
- ถ้าพบ CRITICAL → แจ้งว่า **ห้าม deploy** จนกว่าจะแก้
