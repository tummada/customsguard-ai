# TODO — VOLLOS Backlog

Single source of truth สำหรับงานที่ยังต้องทำ
Updated: 2026-03-10

> **Done items → ดูที่ `CHANGELOG.md`**
> **Test cases → ดูที่ `TEST-PLAN.md`**

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## 🔴 Audit v8 — CRITICAL (5 ตัว) — ต้องแก้ทันที

- [ ] **v8-C1:** Gemini Pass 2 fallback บอกว่า "AI verified" ทั้งที่ไม่ใช่ — `ScanWorkerService.java:362-377` — orElse(validCandidates.get(0)) ใส่ code แรกจาก semantic search แต่ mark requiresReview=false → ลูกค้าเชื่อแล้วกรอก HS Code ผิด โดนปรับ 4 เท่า
- [ ] **v8-C2:** Race condition: 2 workers ทำ job เดียวกัน → items หาย — `ScanWorkerService.java:173-186` — worker แรกชนะ UPDATE ai_jobs คนที่สอง return ทิ้ง items
- [ ] **v8-C3:** Timezone: LocalDateTime สมมติ UTC — `DocumentChunkService.java:207-212` — DB อาจเก็บ Bangkok time → isChunkStale() คลาดเคลื่อน 7 ชม.
- [ ] **v8-C4:** Gemini empty text ไม่ throw — `GeminiChatService.java:81-87` — parts=[] → text="" → return เงียบ → PDF extraction ดูเหมือนสำเร็จ
- [ ] **v8-C5:** cg_document_chunks ไม่มี tenant_id + RLS — V1003 migration + DocumentChunkEntity — RAG chunks เป็น global ทุก tenant เห็นหมด

## ✅ Audit v8 — แก้แล้ว (4 ตัว, 2026-03-11)

- [x] **v8-C1-CURRENCY:** สร้าง CurrencyConversionService — แปลงสกุลเงินต่างประเทศเป็น THB ก่อนคำนวณภาษี (ใช้ exchange rate ศุลกากร + warning ถ้าไม่พบ rate)
- [x] **v8-C2-DECL-TYPE:** ExchangeRateService เลือก rate ตาม declarationType — EXPORT→exportRate, IMPORT→midRate, fallback+log
- [x] **v8-C3-EXPORT-FE:** Frontend เพิ่ม exportRate — types/api-client/hook/banner ครบ 4 ไฟล์
- [x] **v8-H1-REGEX:** HS Code regex แก้จาก 6/8 หลัก → 4/6/8/10 หลัก ตรงกับ DB constraint V1016

## 🟠 Audit v8 — HIGH (7 ตัว) — ควรแก้ sprint นี้

- [ ] **v8-H1:** JSON structure injection ใน invoice text — `ScanWorkerService.java:210-215` — sanitize แค่ quote/backtick แต่ไม่กัน brace injection → ใช้ Jackson ObjectNode แทน string concat
- [ ] **v8-H2:** Threshold ไม่ตรงกัน 3 จุด (0.70/0.65/0.55) — `RagService.java + ScanWorkerService` — เปลี่ยนที่เดียวไม่กระทบที่อื่น → สร้าง config class เดียว
- [ ] **v8-H3:** Rate limit key ไม่มี tenant_id — `ChatGuardService.java:~438` — tenant A ใช้ quota tenant B ถ้า query hash ชน
- [ ] **v8-H4:** PDF magic bytes: ไม่เช็ค read() return value — `ScanService.java:48-53` — ไฟล์ 0 bytes ผ่าน validation
- [ ] **v8-H5:** Gemini API ไม่มี circuit breaker — `GeminiEmbeddingService.java:68-76` — API ค้าง → worker ค้างหมด
- [ ] **v8-H6:** Vertex AI token expire mid-batch — `data-pipeline/09_generate_synthetic_qa.py:70-73` — script >1 ชม. token หมดอายุ ไม่ retry
- [ ] **v8-H7:** HsCodeController.search() ไม่มี @Valid — `HsCodeController.java:28` — query ว่าง/ยาวเกินผ่านได้

## 🟡 Audit v8 — MEDIUM (6 ตัว) — ควรแก้ 2 sprints

- [ ] **v8-M1:** Unpinned image minor versions — `docker-compose.yml:150` — nginx:1.27-alpine, redis:7-alpine ไม่ pin digest
- [ ] **v8-M2:** Empty catch(NumberFormatException) — `ScanWorkerService.java:486` — quantity parse ล้มเหลว → null เงียบ
- [ ] **v8-M3:** Python bare except pass ×3 — `20_rag_eval_pipeline.py:376,414,425` — error หายไปเงียบ
- [ ] **v8-M4:** AdminController dynamic SQL field whitelist — `AdminController.java:157-185` — ไม่มี explicit whitelist
- [ ] **v8-M5:** Missing healthcheck: n8n, marketing, nginx — `docker-compose.yml` — 4/7 services ไม่มี healthcheck
- [ ] **v8-M6:** DB password อาจแสดงใน docker logs (marketing) — `docker-compose.yml:142` — DATABASE_URL expand ${DB_PASSWORD}

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

- [ ] ทดสอบ auto-sync บน dev — boot backend + trigger POST /sync + ตรวจค่า
- [ ] ทดสอบ HTML parser กับ customs.go.th จริง (page format อาจเปลี่ยน)

### Production Auth — รอเจ้าของทดสอบ

- [ ] ล้าง IndexedDB เก่า (F12 → Application → IndexedDB → Delete) → reload Extension → Login with Google → ลากไฟล์ scan
- [ ] **Rotate Google OAuth Client ID** — AI เผลอแสดง Client ID ใน chat → สร้างใหม่ที่ Google Cloud Console → แก้ `.env` + `.env.production` + rebuild Extension

### Deploy Production (Usage Quota + Pricing)

- [ ] Boot backend dev → ทดสอบ GET /v1/usage, POST /v1/admin/upgrade, 429 quota exceeded
- [ ] ทดสอบ Chrome Extension — UsageBadge แสดงถูก, QuotaExceededModal ขึ้นเมื่อเกิน
- [ ] ทดสอบ Marketing Site — หน้า /pricing แสดงถูก, Navbar link ราคา, mobile hamburger
- [ ] Deploy production — push + build + verify

### ⚠️ Post-Deploy: M-admin-header + M-export-rate (ห้ามลืม!)

หลัง deploy เสร็จ ต้องทำ 3 อย่างนี้บน VPS:

1. **ตั้ง admin role ใน DB:**
   ```sql
   UPDATE users SET role='ADMIN' WHERE email='tummadajingjing@gmail.com';
   ```
   (ทำผ่าน `docker exec` หรือ psql — ต้องเชื่อม DB container)

2. **ลบ ADMIN_SECRET จาก `.env.production`:**
   ```bash
   sed -i '/^ADMIN_SECRET/d' /opt/vollos/.env.production
   ```
   (ไม่ต้องใช้แล้ว — admin auth เปลี่ยนเป็น JWT ROLE_ADMIN)

3. **ทดสอบ exchange rate sync ด้วย admin JWT:**
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

### E2E Tests — ค้างงาน

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
