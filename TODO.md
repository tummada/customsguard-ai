# TODO — VOLLOS Backlog

Single source of truth สำหรับงานที่ยังต้องทำ
Updated: 2026-03-10

> **Done items → ดูที่ `CHANGELOG.md`**
> **Test cases → ดูที่ `TEST-PLAN.md`**

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## ✅ CRITICAL — แก้แล้ว (5 ตัว) — 2026-03-10

> จาก Audit v5 (2026-03-10) — 35 findings ทั้งหมด

- [x] **C1:** regex exact match แทน `.contains()` → ScanWorkerService.verifyWithGemini
- [x] **C2:** NO_ITEMS_FOUND status แทน throw error → ScanWorkerService + api-client.ts
- [x] **C3:** มี resource limits อยู่แล้ว (cpus: 0.6, memory: 1536M)
- [x] **C4:** implement excise (AD_VALOREM/SPECIFIC/COMPOUND) + มหาดไทย (10%) → TaxCalculationService
- [x] **C5:** เพิ่ม stale rate warning (>2 ปี) ใน FtaAlertDto + HsLookupService (ข้อมูลจริงต้อง update แยก)

---

## 🔴 Priority 1 — ต้องทำก่อนเปิดให้ลูกค้าใช้

### Audit v5 — HIGH (9 ตัว)

- [x] **H1:** confidence band (HIGH/MEDIUM/LOW) + requiresReview flag → ScanWorkerService
- [x] **H2:** stricter doc chunk threshold (0.70) เมื่อมี HS context → RagService (search + stream)
- [x] **H3:** input length limit 50K chars + control char strip + prompt injection warning → ScanWorkerService
- [x] **H4:** Thai text chunking: paragraph > newline > period > tab (ไม่ตัดที่ space อีก) → DocumentChunkService
- [x] **H5:** conditional UPDATE (WHERE status='PROCESSING') แทน version field → ScanWorkerService
- [x] **H6:** specific exceptions (DataAccessException/timeout/IO) → ExchangeRateSyncService
- [x] **H7:** auto-convert LBS/OZ/TON → KG + flag weightRejected สำหรับ unknown units → ScanWorkerService
- [x] **H8:** log error แทน catch(() => {}) → useUsage.ts, extension-helpers.ts
- [x] **H9:** InterruptedException + IOException + IllegalArgumentException + markJobFailed() → ScanWorkerService

### Audit v5 — MEDIUM ที่กระทบ production (4 ตัว)

- [ ] **M9: @Cacheable key ไม่รวม tenant_id** — HsLookupService.java:96-155 — ข้อมูลข้าม tenant ถ้า query HS code + country เหมือนกัน → เพิ่ม tenant_id ใน cache key
- [ ] **M10: MultipartFile filename ไม่ sanitize** — ScanController.java:33-55 — path traversal risk → sanitize filename
- [x] **M7:** SSE parser rewrite: blank line reset + proper event/data pairing → api-client.ts
- [x] **M8:** try-catch around JSON.parse in SSE handler → api-client.ts

### ความแม่นยำพิกัด + อัตราอากร

- [ ] **เติมอัตราอากร MFN (base_rate)** — 🔄 กำลัง scrape อยู่ (~970 pages, ~2 ชม.) → เสร็จแล้วรัน `python 17_backfill_mfn_rates.py`
- [ ] **Re-scrape NTR จาก Thai IP** — 🔄 กำลังรัน `16_scrape_fta_playwright.py scrape --force --headless` (PID 579862)

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
- [ ] เพิ่ม ADMIN_SECRET ใน `.env.production` บน VPS

### Data Pipeline Tier 2 — ทดสอบ + Deploy

- [ ] ทดสอบ end-to-end บน dev แล้วค่อย deploy production

### VPS Manual Tasks

- [ ] `.env` permission บน VPS — `chmod 600 /opt/vollos/.env.production` (manual SSH)
- [ ] Backup restore test บน VPS — จำลอง restore แล้วตรวจ pgvector + RLS (manual SSH)

---

## 🟡 Priority 2 — ควรทำใน Sprint ถัดไป

### Audit v5 — Logic Bugs (ค้างจาก v4 + ใหม่)

- [ ] **L1: OCR ไม่ตรวจ content validity** — PdfProcessingService.java:69-71 — Gemini Vision OCR ไม่ตรวจว่ามี invoice fields จริง
- [ ] **L2: Embedding loop silent failure** — DocumentChunkService.java:36-95 — Gemini rate limit → failed++ เงียบๆ ไม่ retry → RAG search ได้ผลไม่ครบ
- [ ] **L4: Redis rate limit fixed window** — ChatGuardService.java:425-450 — burst ได้ 10 req ใน 2 วินาทีข้ามรอย window (ไม่ urgent)

### Audit v5 — MEDIUM (8 ตัว)

- [ ] **M1: Unescaped item description ใน verification prompt** — ScanWorkerService.java:352-363 — ลด prompt injection risk
- [ ] **M2: Embedding dimension stale data** — GeminiEmbeddingService.java:90-93 — เปลี่ยน model → embedding เก่ายังอยู่ใน DB → ควร flag/re-embed
- [ ] **M3: ไม่มี re-indexing schedule** — All RAG files — กฎระเบียบเปลี่ยน แต่ chunks เก่า → เพิ่ม monthly re-embed
- [ ] **M4: Tax fields null ถ้า calculateTaxes() fail** — ScanWorkerService.java:136-161 — Frontend ได้ null ไม่รู้ว่าขาด → return explicit error
- [ ] **M5: Non-string weight → .asText() ได้ garbage** — ScanWorkerService.java:440-441 — JSON object ถูกแปลงเป็น "[OBJECT]" → type check ก่อน
- [ ] **M6: Missing defensive check ก่อน .get(0)** — ScanWorkerService.java:304,312 — ถ้า list ว่าง → IndexOutOfBoundsException

### Audit v5 — Architecture (ค้างจาก v4)

- [ ] **A1: Docker CPU = 1.8 cores** — docker-compose.yml — ลด n8n-worker CPU จาก 0.25 เป็น 0.1 (เหลือให้ OS ไม่พอ)
- [ ] **A2: GitLab CI SSH key** — .gitlab-ci.yml:115 — echo SSH_PRIVATE_KEY → ย้ายเป็น File variable หรือ deploy keys
- [ ] **A3: MinIO image unpinned** — docker-compose.dev.yml:30,52 — `minio/minio:latest` → pin version
- [ ] **A4: Redis timeout hardcoded** — application.yml:35-36 — ใช้ `${REDIS_TIMEOUT:5s}` แทน
- [ ] **A5: ลบ root Dockerfile** — Dockerfile ใช้ Maven แต่โปรเจกต์เป็น Gradle → obsolete

### Audit v5 — Quality (ค้างจาก v4)

- [ ] **Q1: ScanService JSON parse swallowed** — ScanService.java:129-131 — catch log warning แต่ไม่ rethrow → job return null items
- [ ] **Q2: Python bare except 11 จุด** — data-pipeline/collectors/*.py — Silent failure → log + re-raise
- [ ] **Q3: Admin secret `required = false`** — AdminController.java:52,116,131,171 — ควรเปลี่ยนเป็น required=true

### Audit v5 — Domain ปรับปรุง UX

- [ ] **D9: Specific Duty** — บางสินค้าใช้อากรตามน้ำหนัก (ต้อง lookup duty type ต่อ HS Code จาก DB)
- [ ] **D10a: UI ไม่แสดง CIF breakdown** — ScanPanel.tsx:140-142 — ไม่เห็น Insurance + Freight → ประมาณราคาผิด
- [ ] **D10b: Error message ไม่บอกวิธีแก้** — "ไม่พบข้อมูล" ไม่มี "ลองค้นด้วยคำอื่น"

### Audit v5 — Security (ไม่เร่งด่วน)

- [ ] **S5: X-Admin-Secret ใน CORS allowedHeaders** — SecurityConfig.java:61 — ควรแยก admin CORS config
- [ ] **S6: ไม่มี rate limit /actuator/health** — vollos.conf:61-64 — timing attack possible
- [ ] **S7: Log email ตอน Google login** — GoogleAuthController.java:86-88 — ควร hash แทน
- [ ] **S8: Gemini response body ถูก log ทั้งก้อน** — GeminiChatService.java:74,142,210 — ควร truncate 200 chars

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
