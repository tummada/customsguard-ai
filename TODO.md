# TODO — VOLLOS Backlog

Single source of truth สำหรับงานที่ยังต้องทำ
Updated: 2026-03-10

> **Done items → ดูที่ `CHANGELOG.md`**
> **Test cases → ดูที่ `TEST-PLAN.md`**

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## ✅ Audit v7 — CRITICAL (4 ตัว) — FIXED 2026-03-10

- [x] **C1-SSRF:** GoogleAuthController — validate JWT format + length before URI.create()
- [x] **C2-GEMINI-JSON:** ScanWorkerService — validate/strip Gemini JSON schema (only keep known fields)
- [x] **C3-VSLEEP:** Thread.sleep() → TimeUnit.MILLISECONDS.sleep() (VT-safe) ใน 4 ไฟล์
- [x] **C4-EXCISE-NULL:** TaxCalculationService — throw error เมื่อ SPECIFIC duty + quantity=null

## ✅ Audit v7 — HIGH (6 ตัว) — FIXED 2026-03-10

- [x] **H1-CORS-DEFAULT:** SecurityConfig — CORS fail-closed (ต้องมี dev profile explicitly)
- [x] **H2-LOG-LEAK:** GeminiChatService — scrub response body จาก log (เหลือแค่ status code)
- [x] **H3-RACE-JOB:** ScanWorkerService — มี FOR UPDATE SKIP LOCKED + conditional UPDATE อยู่แล้ว (verified)
- [x] **H4-PROMPT-INJ:** ScanWorkerService — escape quotes + backticks ใน invoice text ก่อนส่ง Gemini
- [x] **H5-PROMPT-HS:** ScanWorkerService — sanitize candidate descriptions ใน verifyWithGemini
- [x] **H6-SEMANTIC:** ScanWorkerService — cross-check keyword overlap ก่อนยอมรับ semantic match

## ✅ Audit v7 — MEDIUM (11 ตัว) — FIXED 2026-03-10

- [x] **M1-RAG-THRESHOLD:** RagService — aligned disclaimer threshold กับ filter (0.70)
- [x] **M2-SSE-RACE:** RagService — AtomicBoolean flag ให้ emitter.complete() เรียกครั้งเดียว
- [x] **M3-OCR-BLANK:** GeminiChatService — blank OCR ถูก handle โดย PdfProcessingService (verified)
- [x] **M4-NULL-SIM:** RagService — default similarity เป็น 0.0 แทน null
- [x] **M5-RAG-RETRY:** RagService — "ไม่พบ" เป็น expected behavior เมื่อไม่มี data (not a bug)
- [x] **M6-THAI-CHUNK:** DocumentChunkService — เพิ่ม Thai legal breaks (มาตรา/ข้อ), space priority
- [x] **M7-THAI-NUM:** ScanWorkerService — convert Thai numerals ๐-๙ → 0-9
- [x] **M8-EMPTY-QUERY:** RagService — validate empty query ก่อน embedding
- [x] **M9-RAG-CONF:** RagService — aligned confidence disclaimer (0.70 threshold)
- [x] **M10-CATCH:** ScanWorkerService — catch blocks เป็น per-item isolation (designed pattern, verified)
- [x] **M11-NGINX:** Renamed default.conf → 00-default.conf + aligned security headers กับ vollos.conf

## ✅ Audit v5/v6 — Security (FIXED 2026-03-10)

- [x] **S5: X-Admin-Secret** — ลบออกจาก CORS allowedHeaders
- [x] **S6: /actuator/health rate limit** — เพิ่ม limit_req zone=api ใน vollos.conf
- [x] **S7: Log email** — hash email แทน plaintext ใน GoogleAuthController
- [x] **S8: Gemini response body log** — scrub ทั้ง 3 จุด (H2-LOG-LEAK ครอบคลุมแล้ว)

## ✅ Redesign Traffic Light — DONE 2026-03-10

- [x] Backend: ลด minimum threshold → 0.65
- [x] Backend: ลบ confidenceLevel เก่า (HIGH/MEDIUM/LOW)
- [x] Frontend: แก้ `computeAuditRisk()` — แยก confidence color + alert flags
- [x] Frontend: แก้ `TrafficLight.tsx` — 5 ระดับสี + ✅ ยืนยัน + ป้ายเตือนข้างวงกลม
- [x] Frontend: แก้ `LineItemTable.tsx` — ✅ แทน CheckCircle
- [x] Frontend: ลบสีทอง (gold) → ใช้ ✅ checkmark แทน
- [x] Frontend: แก้ tooltip — แสดง confidence % + bar + alerts
- [ ] **ทดสอบ:** ลูกค้า scan invoice → ดูว่าสีวงกลม + ป้ายเตือนแสดงถูกต้องทุกกรณี

---

## 🔴 Priority 1 — ต้องทำก่อนเปิดให้ลูกค้าใช้

### Audit v5/v6 — ค้าง (scope ใหญ่ / manual task)

- [ ] **M-export-rate:** ขาด export rate → ต้องเพิ่ม column ใน ExchangeRateEntity (scope ใหญ่ รอ Sprint ถัดไป)
- [ ] **M-html-fragile:** HTML parsing fragile → ต้อง test กับ customs.go.th จริง (manual task)
- [ ] **M-admin-header:** Admin header-based auth → ต้อง design JWT+ROLE_ADMIN (scope ใหญ่)
- [ ] **M2:** Embedding dimension stale data → ต้อง migration script (scope ใหญ่)
- [ ] **M3:** ไม่มี re-indexing schedule → H-no-reembed fix ช่วยบางส่วนแล้ว (on-demand re-embed)
- [x] **L-dev-secopt:** Dev backend ไม่มี security_opt → dev ไม่มี backend service (N/A)
- [x] **L-model-name:** model name ตรงแล้ว (gemini-embedding-001 ถูกต้อง)
- [ ] **L4:** Redis rate limit fixed window → ไม่ urgent, ยอมรับได้ที่ scale ปัจจุบัน
- [ ] **A2:** GitLab CI SSH key → ต้องทำบน GitLab CI settings (manual task)

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
