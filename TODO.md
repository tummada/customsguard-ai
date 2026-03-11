# TODO — VOLLOS Backlog

Single source of truth สำหรับงานที่ยังต้องทำ
Updated: 2026-03-11 (Deploy production สำเร็จ — AI E2E 39/40 ผ่าน)

> **Done items → ดูที่ `CHANGELOG.md`**
> **Test cases → ดูที่ `TEST-PLAN.md`**

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## ✅ Audit v9 — CRITICAL (8 ตัว) — แก้ครบแล้ว 2026-03-11

- [x] **v8-C1:** Gemini fallback → requiresReview=true + label "Semantic fallback"
- [x] **v8-C2:** Race condition → FOR UPDATE SKIP LOCKED + status check + row count
- [x] **v8-C3:** Timezone → เปลี่ยนเป็น Instant (ไม่มี timezone assumption)
- [x] **v8-C4:** Gemini empty text → throw RuntimeException (trigger retry)
- [x] **v8-C5:** document_chunks → V1018 migration เพิ่ม tenant_id + RLS + defense-in-depth WHERE clause
- [x] **v9-C1:** normalizeNumber → แยก US/EU format ถูกต้อง ("1,234"→1234, "1,23"→1.23)
- [x] **v9-C2:** SSE stream → capture tenantId ก่อน async, restore ใน lambda, clear ใน finally
- [x] **v9-C3:** SSE disclaimer → เพิ่มคำเตือนเหมือน non-streaming path + confidence ใน done event

## ✅ Audit v9 — HIGH (8 ตัว) — แก้ครบแล้ว 2026-03-11

- [x] **v8-H1:** JSON injection → sanitize braces {}[] เป็น ()
- [x] **v8-H2:** Threshold → รวมศูนย์ใน application.yml (6 ค่า) + @Value
- [x] **v8-H3:** Rate limit key → มี tenant_id อยู่แล้ว (ตรวจยืนยันแล้ว)
- [x] **v8-H4:** PDF magic bytes → เช็ค read() return value (bytesRead < 4 → reject)
- [x] **v8-H5:** Circuit breaker → 3 สถานะ CLOSED/OPEN/HALF_OPEN, 5 failures, 60s cooldown
- [x] **v8-H6:** Token refresh → TokenManager class, proactive refresh 45 นาที
- [x] **v8-H7:** @Valid → @Validated + @NotBlank + @Size(max=500) + 400 handler
- [x] **v9-H1:** Parser alert → ตรวจจับ low currency count, ALERT log, getSyncStatus()

## 🟡 Audit v9 — MEDIUM (12 ตัว) — ควรแก้ 2 sprints

### ค้างจาก v8 (6 ตัว)

- [ ] **v8-M1:** Unpinned image minor versions — `docker-compose.yml:150` — nginx:1.27-alpine, redis:7-alpine ไม่ pin digest
- [ ] **v8-M2:** Empty catch(NumberFormatException) — `ScanWorkerService.java:486` — quantity parse ล้มเหลว → null เงียบ
- [ ] **v8-M3:** Python bare except pass ×3 — `20_rag_eval_pipeline.py:376,414,425` — error หายไปเงียบ
- [ ] **v8-M4:** AdminController dynamic SQL field whitelist — `AdminController.java:157-185` — ไม่มี explicit whitelist
- [ ] **v8-M5:** Missing healthcheck: n8n, marketing, nginx — `docker-compose.yml` — 4/7 services ไม่มี healthcheck
- [ ] **v8-M6:** DB password อาจแสดงใน docker logs (marketing) — `docker-compose.yml:142` — DATABASE_URL expand ${DB_PASSWORD}

### พบใหม่จาก v9 (6 ตัว)

- [ ] **v9-M1:** CIF = Cost+Insurance+Freight ไม่ถูกบังคับ — `TaxCalculationController.java:23` — DTO มี insuranceAmount/freightAmount แต่ Controller ไม่รวมค่า → ถ้าลูกค้าใส่ FOB + Insurance + Freight แยก จะคำนวณอากรจากแค่ FOB
- [ ] **v9-M2:** chunkAndEmbedAll ไม่มี concurrent call protection — `DocumentChunkService.java:41` — เรียกซ้ำพร้อมกัน → duplicate chunks ใน vector search
- [ ] **v9-M3:** HS Code regex ไม่ตรงกัน FE↔BE — `LineItemTable.tsx:21` ไม่รับ 4 หลัก/10 หลัก ที่ `ScanWorkerService.java:644` รับ
- [ ] **v9-M4:** unlimitedStorage permission น่าจะไม่จำเป็น — `manifest.json` — Dexie ใช้ IndexedDB ไม่ต้องการ permission นี้
- [ ] **v9-M5:** Hardcoded fallback JWT secret ใน data-pipeline — `20_rag_eval_pipeline.py:384` — `os.getenv("JWT_SECRET", "vollos-dev-secret-...")` ถ้า env var ไม่ set จะใช้ dev secret
- [ ] **v9-M6:** batchLookup ไม่ผ่าน cache — `HsLookupService.java:44-58` — ทุก batch call ตี DB 6 queries ไม่ใช้ @Cacheable

---

## 🔴 Priority 1 — ต้องทำก่อนเปิดให้ลูกค้าใช้

### Audit v5/v6 — ค้าง (scope ใหญ่ / manual task)

- [ ] **M2:** Embedding dimension stale data → ต้อง migration script (scope ใหญ่)
- [ ] **M3:** ไม่มี re-indexing schedule → H-no-reembed fix ช่วยบางส่วนแล้ว (on-demand re-embed)
- [ ] **L4:** Redis rate limit fixed window → ไม่ urgent, ยอมรับได้ที่ scale ปัจจุบัน
- [ ] **A2:** GitLab CI SSH key → ต้องทำบน GitLab CI settings (manual task)

### ทดสอบ Traffic Light (จาก Redesign — ค้าง)

- [ ] **ทดสอบ:** ลูกค้า scan invoice → ดูว่าสีวงกลม + ป้ายเตือนแสดงถูกต้องทุกกรณี

### อัตราแลกเปลี่ยน — ทดสอบ Auto-sync

- [x] ทดสอบ auto-sync บน dev — boot backend + trigger POST /sync + ตรวจค่า ✅ AI ทดสอบแล้ว (18 สกุลเงิน, effective 2026-03-10)
- [ ] ทดสอบ HTML parser กับ customs.go.th จริง (page format อาจเปลี่ยน)
- [x] สร้าง endpoint `GET /sync-status` ✅ 2026-03-11 (admin only, deployed to production)

### Production Auth — รอเจ้าของทดสอบ

- [ ] ล้าง IndexedDB เก่า (F12 → Application → IndexedDB → Delete) → reload Extension → Login with Google → ลากไฟล์ scan
- [ ] **Rotate Google OAuth Client ID** — AI เผลอแสดง Client ID ใน chat → สร้างใหม่ที่ Google Cloud Console → แก้ `.env` + `.env.production` + rebuild Extension

### Deploy Production (Usage Quota + Pricing)

- [x] Boot backend dev → ทดสอบ GET /v1/usage, POST /v1/admin/upgrade, 429 quota exceeded ✅ AI ทดสอบแล้ว
- [ ] ทดสอบ Chrome Extension — UsageBadge แสดงถูก, QuotaExceededModal ขึ้นเมื่อเกิน (ต้องเทสด้วยมือ)
- [ ] ทดสอบ Marketing Site — หน้า /pricing แสดงถูก, Navbar link ราคา, mobile hamburger (ต้องเทสด้วยมือ)
- [x] Deploy production — push + build + verify ✅ 2026-03-11 (29 migrations, health UP)

### ⚠️ Post-Deploy: M-admin-header + M-export-rate — ✅ เสร็จแล้ว 2026-03-11

~~หลัง deploy เสร็จ ต้องทำ 3 อย่างนี้บน VPS:~~

1. **~~ตั้ง admin role ใน DB:~~** ✅ เสร็จแล้ว (UPDATE 1)
   ```sql
   UPDATE users SET role='ADMIN' WHERE email='tummadajingjing@gmail.com';
   ```
   (ทำผ่าน `docker exec` หรือ psql — ต้องเชื่อม DB container)

2. **~~ลบ ADMIN_SECRET จาก `.env.production`:~~** ✅ เสร็จแล้ว
   ```bash
   sed -i '/^ADMIN_SECRET/d' /opt/vollos/.env.production
   ```

3. **ทดสอบ exchange rate sync ด้วย admin JWT:** (รอเจ้าของ login Google แล้วทดสอบ)
   ```bash
   # ขอ admin token (ต้อง login ด้วย Google ก่อน แล้ว role จะเป็น ADMIN)
   # จากนั้นเรียก:
   curl -X POST https://api.vollos.ai/v1/customsguard/exchange-rates/sync \
     -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
   # ต้องได้ {"synced": N, "source": "customs.go.th"} ถ้า N > 0 = สำเร็จ
   # ถ้า 403 = role ยังไม่ใช่ ADMIN → ตรวจ DB ว่า UPDATE สำเร็จหรือยัง
   ```

### Data Pipeline Tier 2 — ทดสอบ + Deploy

- [ ] ทดสอบ end-to-end บน dev แล้วค่อย deploy production

### VPS Manual Tasks

- [ ] `.env` permission บน VPS — `chmod 600 /opt/vollos/.env.production` (manual SSH)
- [ ] Backup restore test บน VPS — จำลอง restore แล้วตรวจ pgvector + RLS (manual SSH)

---

## 🟡 Priority 2 — ควรทำใน Sprint ถัดไป

### Audit v5 — Domain ปรับปรุง UX

- [ ] **D9: Specific Duty** — บางสินค้าใช้อากรตามน้ำหนัก (ต้อง lookup duty type ต่อ HS Code จาก DB)
- [ ] **D10a: UI ไม่แสดง CIF breakdown** — ScanPanel.tsx:140-142 — ไม่เห็น Insurance + Freight → ประมาณราคาผิด
- [ ] **D10b: Error message ไม่บอกวิธีแก้** — "ไม่พบข้อมูล" ไม่มี "ลองค้นด้วยคำอื่น"

### Audit Log — ยังไม่สมบูรณ์

สถานะ: เก็บ log ใน Dexie (client-side) แล้ว แต่ยังขาด:

- [ ] Backend table `cg_audit_logs` + API endpoint
- [ ] Sync mechanism จาก Dexie → backend
- [ ] UI หน้าดู audit log (timeline view)
- [ ] Export เป็น CSV/PDF สำหรับยื่นศุลกากร ("Liability Shield")

### Marketing Site — รูปภาพ + วีดีโอ

**Phase 3: รูปภาพ**
- [ ] สร้าง OG Image 1200x630px (`/public/og-default.jpg`) — สีทอง #D4AF37
- [ ] ถ่าย product screenshot จาก Chrome Extension จริง 4 รูป (hero, step 1-3)
- [ ] สร้าง/หารูป pain section (AI-generated หรือ stock)
- [ ] อัพเดท paths ใน `hs-code.ts` ให้ชี้ไปรูปจริงแทน placehold.co

**Phase 4: Demo Video (1-3 เดือน)**
- [ ] ถ่าย screen recording 60-90 วินาที: Upload PDF → AI Scan → FTA → Magic Fill → Chat
- [ ] ใส่คำบรรยายไทย + background music royalty-free
- [ ] เปลี่ยน hero image เป็น `<video>` ใน `LandingTemplate.tsx`

### E2E Tests

- [x] AI E2E Tests — 37/38 ผ่าน (ทำครบทุกเคส AI บน dev) ✅ 2026-03-11
- [ ] เจ้าของทดสอบด้วยมือ — Chrome Extension login + scan + ดูหน้าจอจริง
- [ ] เพิ่ม screenshots — ถ่ายภาพหน้าจอทุก step (บางส่วนได้แล้วที่ `e2e-results/manual/`)
- [ ] เขียน demo script สำหรับถ่ายวิดีโอ — Mode 3 ของ vollos-tester

---

## 🟢 Priority 3 — Backlog (ทำเมื่อพร้อม)

### Audit v5 — LOW (5 ตัว)

- [ ] **L-console: console.log 25+ จุดใน Chrome Extension** — อาจ leak HS code/job ID ใน DevTools → strip ตอน build
- [ ] **L-imports: Wildcard imports ใน Java controllers** — ไม่กระทบ runtime แต่ไม่ clean
- [ ] **L-pagination: Pagination size ไม่ validate** — HsCodeRepository.java:15-21 — ขอ size=10000 ได้ → จำกัด max 100
- [ ] **L-homoglyph: Thai homoglyph detection อาจ miss decomposed forms** — ChatGuardService.java:43-49 — theoretical
- [ ] **L-duplicate: Duplicate code ใน HsLookupService mapping chains** — HsLookupService.java:71-89 — refactor ได้

### Opn Payments (Omise) — ระบบชำระเงินอัตโนมัติ

ลูกค้ากดอัพเกรด PRO → จ่ายเงิน → อัพเกรดทันที (เงื่อนไข: สมัครบุคคลธรรมดาได้)

- [ ] เจ้าของสมัคร Opn Payments — https://www.opn.ooo → ยืนยันตัวตน → ได้ API keys
- [ ] Backend: `POST /v1/payment/create-charge` (PromptPay QR + บัตรเครดิต)
- [ ] Backend: `POST /v1/payment/webhook` → upgrade อัตโนมัติเมื่อจ่ายสำเร็จ
- [ ] Pricing Page: ปุ่มจ่ายเงินจริง (แทน "ติดต่อ LINE OA")
- [ ] Extension: ปุ่ม Upgrade ใน QuotaExceededModal → checkout Opn
- [ ] ทดสอบ end-to-end: FREE → เกินโควต้า → Upgrade → จ่ายเงิน (test mode) → PRO ทันที

### Content Marketing — ระบบผลิตบทความ SEO + Social อัตโนมัติ

DB + site + agent prompts + คู่มือเสร็จแล้ว เหลือ setup + launch:

- [ ] สมัคร Social Media Accounts (FB Page, IG, TikTok, YouTube, X)
- [ ] สร้าง Google Sheets สำหรับ review content
- [ ] Import n8n workflows 5 ไฟล์ → ใส่ credentials → activate
- [ ] ทดสอบ end-to-end: สร้าง content → review → publish → ตรวจทุก platform

### Domain Features — Backlog

- [ ] **SerialGC → G1GC** — Dockerfile.jvm:24 — production ควรใช้ G1GC (performance)

### Data Pipeline — Collectors ที่ยัง Fail

- [ ] `antidumping_dft.py` — collector โหลดผิดไฟล์ (ได้ privacy policy แทนประกาศ AD/CVD)
- [ ] `nsw_lpi_controls.py` — collector ได้แค่ homepage (ต้อง scrape ลึกกว่าหรือหาแหล่งอื่น)
