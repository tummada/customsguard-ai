# TODO — VOLLOS Backlog

Single source of truth สำหรับงานที่ยังต้องทำ
Updated: 2026-03-10

> **Done items → ดูที่ `CHANGELOG.md`**
> **Test cases → ดูที่ `TEST-PLAN.md`**

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## ✅ CRITICAL — แก้แล้ว (5+5 ตัว) — 2026-03-10

> จาก Audit v5 + v6 — แก้ครบ

### Audit v5 CRITICAL (5 ตัว)
- [x] **C1:** regex exact match แทน `.contains()` → ScanWorkerService.verifyWithGemini
- [x] **C2:** NO_ITEMS_FOUND status แทน throw error → ScanWorkerService + api-client.ts
- [x] **C3:** มี resource limits อยู่แล้ว (cpus: 0.6, memory: 1536M)
- [x] **C4:** implement excise (AD_VALOREM/SPECIFIC/COMPOUND) + มหาดไทย (10%) → TaxCalculationService
- [x] **C5:** เพิ่ม stale rate warning (>2 ปี) ใน FtaAlertDto + HsLookupService (ข้อมูลจริงต้อง update แยก)

### Audit v6 CRITICAL (5 ตัว)
- [x] **C1:** Hardcoded DB password → `${SQL_DB_PASSWORD:?...}` ใน gcp-setup.sh
- [x] **C2:** DocumentChunk overlap logic แตก → แก้ condition ป้องกัน infinite loop + overlap ถูกต้อง
- [x] **C3:** Chrome Extension origin wildcard → exact hostname match (ALLOWED_ORIGINS.includes)
- [x] **C4:** STALE_THRESHOLD static final → ย้ายเข้า method `staleThreshold()` คำนวณใหม่ทุกครั้ง
- [x] **C5:** CIF price EU format ผิด → เพิ่ม `normalizeNumber()` จัดการ "1.234,56" format

---

## 🔴 Priority 1 — ต้องทำก่อนเปิดให้ลูกค้าใช้

### Audit v6 — HIGH (7 ตัว — แก้ครบ ✅)

- [x] **H-chunk-thai:** Thai period ไม่ match → เพิ่ม ฯ (U+0E2F Thai abbreviation mark)
- [x] **H-gemini-null:** GeminiChat null-safety → null check ก่อน return
- [x] **H-gemini-space:** "[]" vs "[ ]" → strip() ก่อน compare ทั้ง retry + empty check
- [x] **H-no-reembed:** ไม่มี re-embed logic → ตรวจ updatedAt ของ Regulation vs chunk, delete + re-embed ถ้า stale
- [x] **H-topics:** UNAVAILABLE_TOPICS ไม่ครบ → เพิ่ม safeguard, countervailing, origin verification, tariff quota
- [x] **H-sse-loop:** SSE emitter loop risk → ไม่ส่ง error หลัง IOException, finally emitter.complete()
- [x] **H-admin-valid:** Missing @Valid → เพิ่ม @Valid ที่ GoogleAuthController, body validation + @NotBlank ที่ AdminController

### Audit v5 — HIGH (9 ตัว — แก้ครบ ✅)

- [x] **H1-H9:** ทั้งหมดแก้แล้ว (ดู CHANGELOG.md)

### Audit v6 — MEDIUM (10 ตัว — แก้ 8 ✅)

- [x] **M-cif-breakdown:** เพิ่ม insuranceAmount + freightAmount fields ใน TaxCalculationRequest
- [x] **M-aed:** เพิ่ม AED ใน TARGET_CURRENCIES
- [x] **M-json-escape:** ใช้ Jackson ObjectMapper แทน manual escape ใน DocumentChunkService
- [x] **M-confidence:** 0.95 ย้ายเข้า config `customsguard.scan.high-confidence-threshold`
- [x] **M-excise-range:** "100-150" → ใช้ upper bound, ไม่ strip dash
- [x] **M-error-msg:** Error messages เพิ่ม Thai hints ตาม HTTP status
- [x] **M-cors:** CORS tighten → explicit origins แทน wildcard
- [ ] **M-export-rate:** ขาด export rate → ต้องเพิ่ม column ใน ExchangeRateEntity (scope ใหญ่ รอ Sprint ถัดไป)
- [ ] **M-html-fragile:** HTML parsing fragile → ต้อง test กับ customs.go.th จริง (manual task)
- [ ] **M-admin-header:** Admin header-based auth → ต้อง design JWT+ROLE_ADMIN (scope ใหญ่)

### Audit v5 — MEDIUM (8 ตัว — แก้ 6 ✅)

- [x] **M1:** Unescaped item description → sanitize control chars + quotes ก่อนส่ง Gemini
- [x] **M4:** Tax fields null → เพิ่ม `taxError` field เมื่อ calculateTaxes() fail
- [x] **M5:** Non-string weight → type check ก่อน asText() + warning message
- [x] **M6:** .get(0) — ตรวจแล้ว มี guard ทุกจุด (isEmpty check ก่อน)
- [x] **M7:** SSE parser rewrite (แก้แล้วจาก v5)
- [x] **M8:** try-catch JSON.parse SSE (แก้แล้วจาก v5)
- [x] **M9:** @Cacheable key เพิ่ม tenant_id → ป้องกันข้อมูลข้าม tenant
- [x] **M10:** MultipartFile filename sanitize → reject path traversal
- [ ] **M2:** Embedding dimension stale data → ต้อง migration script (scope ใหญ่)
- [ ] **M3:** ไม่มี re-indexing schedule → H-no-reembed fix ช่วยบางส่วนแล้ว (on-demand re-embed)

### Audit v6 — LOW (5 ตัว — แก้ 3 ✅)

- [x] **L-dev-latest:** MinIO pin version → RELEASE.2024-11-07
- [x] **L-localhost:** ลบ localhost จาก manifest.json host_permissions
- [x] **L-sast:** SAST allow_failure → false
- [ ] **L-dev-secopt:** Dev backend ไม่มี security_opt → dev ไม่มี backend service (N/A)
- [ ] **L-model-name:** model name ตรงแล้ว (gemini-embedding-001 ถูกต้อง)

### Audit v5 — Logic Bugs (3 ตัว — แก้ 2 ✅)

- [x] **L1:** OCR ไม่ตรวจ content validity → เพิ่ม looksLikeInvoice() heuristic check
- [x] **L2:** Embedding loop silent failure → ALERT log + H-no-reembed ช่วย retry ครั้งถัดไป
- [ ] **L4:** Redis rate limit fixed window → ไม่ urgent, ยอมรับได้ที่ scale ปัจจุบัน

### Audit v5 — Architecture (5 ตัว — แก้ 4 ✅)

- [x] **A1:** Docker CPU 1.8 → 1.65 cores (n8n-worker 0.25→0.10) เหลือให้ OS 0.35
- [ ] **A2:** GitLab CI SSH key → ต้องทำบน GitLab CI settings (manual task)
- [x] **A3:** MinIO image unpinned → pin version
- [x] **A4:** Redis timeout hardcoded → `${REDIS_TIMEOUT:5s}`
- [x] **A5:** ลบ root Dockerfile (Maven obsolete)

### Audit v5 — Quality (3 ตัว — แก้ครบ ✅)

- [x] **Q1:** ScanService JSON parse swallowed → log.error ALERT
- [x] **Q2:** Python bare except → except Exception as e + log
- [x] **Q3:** Admin secret required=false → required=true (default)

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
