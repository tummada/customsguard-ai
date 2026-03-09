# TODO — VOLLOS Backlog

Shared backlog visible to all AI tools and humans.
Updated: 2026-03-09

---

## สิ่งที่เหลือต้องทำ

### Opn Payments (Omise) — ระบบชำระเงินอัตโนมัติ

**ทำไปทำไม:** ลูกค้ากดอัพเกรด PRO → จ่ายเงินเสร็จ → ระบบอัพเกรดทันทีอัตโนมัติ ไม่ต้องรอ admin กดให้

**เงื่อนไข:** สมัครได้เป็นบุคคลธรรมดา (ไม่ต้องจดบริษัท) ใช้บัตรประชาชน

**สิ่งที่ต้องทำ (เรียงตามลำดับ):**
- [ ] **เจ้าของสมัคร Opn Payments** — https://www.opn.ooo → ยืนยันตัวตน → ได้ API keys (test + live)
- [ ] **Backend: Charge API** — `POST /v1/payment/create-charge` สร้าง Opn charge (PromptPay QR + บัตรเครดิต)
- [ ] **Backend: Webhook receiver** — `POST /v1/payment/webhook` รับ event จาก Opn → เมื่อจ่ายสำเร็จ เรียก upgrade API อัตโนมัติ
- [ ] **Pricing Page: ปุ่มจ่ายเงินจริง** — เปลี่ยนจาก "ติดต่อ LINE OA" → redirect ไปหน้า checkout Opn
- [ ] **Extension: ปุ่ม Upgrade ใน QuotaExceededModal** → เปิดหน้า checkout
- [ ] **ทดสอบ end-to-end** — สมัคร FREE → ใช้จนเกิน → กด Upgrade → จ่ายเงิน (test mode) → PRO ทันที

---

### ทดสอบ + Deploy Production (Usage Quota + Pricing)

**สิ่งที่ต้องทำ:**
- [ ] Boot backend dev → ทดสอบ GET /v1/usage, POST /v1/admin/upgrade, 429 quota exceeded
- [ ] ทดสอบ Chrome Extension — UsageBadge แสดงถูก, QuotaExceededModal ขึ้นเมื่อเกิน
- [ ] ทดสอบ Marketing Site — หน้า /pricing แสดงถูก, Navbar link ราคา, mobile hamburger
- [ ] Deploy production — push + build + verify
- [ ] เพิ่ม ADMIN_SECRET ใน `.env.production` บน VPS

---

### Data Pipeline Tier 2 — Collectors 5 ตัวที่เหลือ (ข้อมูลเสริม)

**ทำไปทำไม:** เพิ่ม coverage ให้ RAG — AD/CVD duty, ใบอนุญาตนำเข้า, BOI สิทธิพิเศษ, สรรพสามิต, คำวินิจฉัยจาก US CBP

**สถานะ:** In Progress — code เขียนเสร็จ, รอ sync แก้ bug + รัน parse

**Step 1: ทดสอบ collectors — DONE (2026-03-06)**
- [x] รัน `antidumping_dft.py` — ⚠️ Partial: 3 HTML tables + 1 PDF (3 PDFs ชื่อไฟล์ยาวเกิน)
- [x] รัน `nsw_lpi_controls.py` — ⚠️ Partial: DFT 222KB + FDA/TISI เล็ก, พบ 13 PDFs
- [x] รัน `boi_privileges.py` — ❌ Failed: เว็บเป็น SPA (JS-rendered) ได้แค่ HTML เปล่า
- [x] รัน `excise_tax.py` — ❌ Failed: เว็บ excise.go.th เปลี่ยน structure
- [x] รัน `cbp_cross_rulings.py` — ❌ Failed: API response format เปลี่ยน ได้ 0 rulings

**Step 2: DB Migration + Processing Scripts — DONE (2026-03-06)**
- [x] `V1012__supplementary_tenant_rls.sql` — เพิ่ม tenant_id + RLS ให้ tables ที่มีอยู่แล้ว (V1008-V1011 ถูกใช้ไปแล้ว)
- [x] `06b_parse_antidumping.py` — parse HTML tables + PDFs → `cg_ad_duties` + `cg_regulations` (06 มีอยู่แล้ว)
- [x] `07b_parse_licenses.py` — parse NSW + agency data → `cg_lpi_controls` (07 มีอยู่แล้ว)
- [x] `09b_parse_supplementary.py` — parse BOI + Excise + CBP → tables + `cg_regulations` (09 มีอยู่แล้ว)
- [x] `10_embed_supplementary.py` — chunk + embed ข้อมูลใหม่เข้า `cg_document_chunks`

**Step 3: Java Backend — DONE (2026-03-06)**
- [x] สร้าง Entity: `ImportLicenseEntity`, `BoiPrivilegeEntity`, `ExciseRateEntity` + DTOs
- [x] สร้าง Repository: `ImportLicenseRepository`, `BoiPrivilegeRepository`, `ExciseRateRepository`
- [x] แก้ `RagService` — ลบ BOI/LPI/Excise ออกจาก UNAVAILABLE_TOPICS (มี data แล้ว)
- [x] แก้ `HsLookupService` — return licenses/BOI/excise ควบคู่กับ FTA rates

**Step 4: Eval Cases — DONE (2026-03-06)**
- [x] เขียน `eval_supplementary_suite.json` — 18 cases (5 หมวด: AD 5, license 4, BOI 3, excise 3, cross-cutting 3)

**Step 5: Sync + แก้ bug — DONE (2026-03-07)**
- [x] **แก้ Schema Mismatch** — ลบ `ImportLicenseEntity` (ซ้ำกับ `cg_lpi_controls`), แก้ `BoiPrivilegeEntity` + `ExciseRateEntity` columns ให้ตรง V1006, สร้าง `AdDutyEntity` ใหม่
- [x] **แก้ collectors ที่ fail:**
  - [x] `cbp_cross_rulings.py` — แก้ API params + response parsing → **19,897 rulings**
  - [x] `boi_privileges.py` — Playwright headed + stealth bypass Incapsula → **6 pages + 35 PDFs**
  - [x] `excise_tax.py` — หา URL ใหม่ `/excise2017/` + known PDFs → **187 PDFs (418 MB)**
  - [x] `antidumping_dft.py` — hash ชื่อไฟล์ยาว → **2 PDFs + 3 tables**

**Step 6: รัน pipeline + ทดสอบ (TODO)** — รอ OAuth test เสร็จก่อนค่อยทำต่อ
- [x] **Boot backend ทดสอบ compile** — Flyway 21 migrations validated, Hibernate ORM 6.6.15 ผ่าน, entities ตรง DB schema
- **รัน parse + embed:**
  - [x] CBP Rulings → **19,806 records** เข้า `cg_regulations`
  - [x] Anti-Dumping → 0 (collector ดาวน์โหลดผิดไฟล์ — ดูด้านล่าง)
  - [x] NSW/LPI → 0 (collector ได้แค่ homepage — ดูด้านล่าง)
  - [x] BOI → 35 PDFs processed แต่ได้ 0 records (PDFs เป็น forms/ประกาศ IT ไม่มี structured privileges)
  - [x] Excise → 187 PDFs processed → **41 excise rates** (5 failed JSON parse)
- [x] **รัน embed** — 51 chunks ใหม่ (LPI 9 + Excise 42), total 4,729 chunks ✅ (2026-03-09)
- [x] **รัน eval** — ⚠️ Regression: 90.1% → 81% เพราะ test suite ใหม่ยากกว่า (MFN duty N/A, red team bypass) ✅ (2026-03-09)
- [ ] **แก้ regression:** MFN duty rates "N/A" + redteam_offtopic/gibberish bypass ChatGuard
- [x] **🐛 Bug: ChatGuard Thai NFKC normalization** — แก้แล้ว: เพิ่ม `nfkc()`, `nfkcPattern()`, `nfkcSet()`, `nfkcList()` helpers pre-normalize ทุก Thai pattern/keyword ด้วย NFKC ตอน class load ✅ (2026-03-09)
- [ ] ทดสอบ end-to-end บน dev แล้วค่อย deploy production

**Backlog — ต้องแก้ collector ก่อนถึงจะ parse ได้ (ทำทีหลัง):**
- [ ] `antidumping_dft.py` — collector โหลดผิดไฟล์ (ได้ privacy policy แทนประกาศ AD/CVD) → ต้องหา URL ที่ถูกต้องของประกาศจาก dft.go.th
- [ ] `nsw_lpi_controls.py` — collector ได้แค่ homepage (ไม่มี structured HS code ↔ ใบอนุญาต) → ต้อง scrape ลึกกว่า homepage หรือหาแหล่ง data อื่น

---

### Data Pipeline — RAG quality plateau (eval ~90%, LLM flaky ~10%)

**สถานะ:** Done — ปรับ 3 ด้านเพื่อลด flaky failures

**สิ่งที่ทำแล้ว:**
- [x] Tune Gemini prompt — เพิ่มกฎ "ห้ามใช้สินค้าอื่นตอบแทน" + กฎเปรียบเทียบ FTA, ลด temperature 0.2→0.1, เพิ่ม maxOutputTokens 1024→1536
- [x] เพิ่ม data: ks_009 (อาหารสุนัข) + ks_multi_005 (ข้าวหอมมะลิจีน) ผ่าน eval แล้ว, เพิ่ม FTA rates ใน HS code context (ก่อนหน้าไม่ส่ง FTA ให้ LLM)
- [x] ปรับ threshold: HS code 0.60→0.55, context limit 5→8, switch จาก semantic-only เป็น hybrid search (full-text + semantic RRF)

---

### Content Marketing — ระบบผลิตบทความ SEO + โพส Social อัตโนมัติ

**ทำไปทำไม:** ให้ AI (ChatGPT, Perplexity, Google) แนะนำ VOLLOS เมื่อคนถามเรื่องศุลกากร + ดึงลูกค้าผ่าน Google SEO ฟรี

**Flow:** Claude Code สร้าง content → พนักงาน review ใน Google Sheets → n8n โพสอัตโนมัติ

**สิ่งที่เสร็จแล้ว:**
- [x] DB schema (`mkt_content` table + RLS)
- [x] Marketing site + blog pages (Next.js dynamic routes)
- [x] HS Lookup Tool — free tool ให้คนค้นหา HS Code (citation bait)
- [x] Schema.org structured data (ArticleSchema + HSCodeToolSchema)
- [x] AI Agent prompts 3 ตัว (Researcher + Grumpy Expert + Chief Editor) + Gemini Cross-Check
- [x] คู่มือพนักงาน (`docs/content-marketing/OPERATIONS-MANUAL.md`)
- [x] คำสั่งสำเร็จรูป 10 ชุด + Case Study C1-C15 + Q&A Q1-Q15
- [x] n8n workflow JSON templates 5 ไฟล์ (`infra/n8n-workflows/`)

**สิ่งที่ต้องทำ (เรียงตามลำดับ):**
- [ ] **สมัคร Social Media Accounts** — FB Page, IG Business, TikTok Business, YouTube Channel, X/Twitter
- [ ] **สร้าง Google Sheets** — สำหรับ review content (columns: title, body, hs_codes_mentioned, confidence_score, customs_verify_url, Final_Status, Finished)
- [ ] **Import n8n workflows** — เปิด n8n UI → import 5 JSON files → ใส่ credentials (DB, Google Sheets, Meta API, TikTok API, YouTube API, X API, SendGrid) → activate
  - `sheets-review-sync` — sync draft content ↔ Google Sheets ทุก 30 นาที
  - `blog-publisher` — publish blog เมื่อถึงเวลา schedule
  - `social-publisher` — โพสไป FB/IG/TikTok/YouTube/X อัตโนมัติ
  - `token-refresh` — auto-refresh social API tokens ก่อนหมดอายุ
  - `lead-nurture` — ส่ง email series ให้ lead ใหม่ (SendGrid)
- [ ] **ทดสอบ end-to-end** — สร้าง content ชุดแรก → review ใน Sheets → publish blog → โพส social → ตรวจว่าขึ้นทุก platform

---

### Marketing Site Content & Asset Audit — แก้ข้อความเท็จ + เพิ่มรูป/วีดีโอ

**ทำไปทำไม:** Landing page มีข้อความเกินจริง/เท็จ 10+ จุด (อ้าง feature ที่ไม่มี, ตัวเลข 100%/0% ที่เป็นไปไม่ได้, ISO-27001 ที่ไม่มี) + รูปภาพ placeholder ทั้ง 5 จุด + ไม่มี OG image + ไม่มีวีดีโอ

**สถานะ:** Phase 1 DONE (2026-03-06)

**ไฟล์หลัก:** `marketing-site/src/config/products/hs-code.ts` (ข้อความทั้งหมด)

**Phase 1: แก้ข้อความเท็จ — DONE (2026-03-06)**
- [x] แก้ "AI Scan ลดเหลือ 0%" → "ลดข้อผิดพลาดได้กว่า 80%"
- [x] แก้ "แม่นยำ 100%" ใน Magic Fill → "ลดการพิมพ์ซ้ำและข้อผิดพลาดจากการคัดลอกด้วยมือ"
- [x] แก้ "ป้องกัน...100%" ใน RegTech → ลบ 100% ออก
- [x] แก้ "ไม่เปิดเผย...100%" ใน Security → ลบ 100% ออก
- [x] แทน **Shadow Auditor** (feature ไม่มีจริง) → ด้วย "ถาม AI เรื่องศุลกากร" (RAG Chat ที่มีจริง)
- [x] แทน **Smart Grouping** (feature ไม่มีจริง) → เป็น "เร็วๆ นี้" + badge ROADMAP
- [x] แก้ **RegTech Permit Guard** → เป็น "(Beta)" เพราะยังไม่มีข้อมูล LPI
- [x] แก้ Security labels: "AES-256 ENCRYPTED" → "HTTPS ENCRYPTED", "ISO-27001 READY" → "SECURITY BY DESIGN"
- [x] แก้ Footer: "Compliant with Customs Department standards" → "อ้างอิงข้อมูลจากกรมศุลกากร"
- [x] แก้ ROI headline: "ประหยัดได้จริง" → "ประหยัดได้สูงสุด" + เพิ่ม disclaimer footnote
- [x] แก้ ATIGA flag: Thai flag → globe emoji (ไม่มี ASEAN flag emoji)
- [x] แก้ Process Step 2: ลบ "Form E" (ระบบไม่ได้สร้าง Form E)
- [x] เพิ่ม footnote "*ตัวเลขเป็นค่าประมาณจากข้อมูลอุตสาหกรรม" ใน pain section + ROI

**Phase 2: Layout Fixes — DONE (2026-03-09)**
- [x] เพิ่ม ROADMAP badge styling สีเทา (`bg-gray-100 text-gray-400`) แยกจาก badge ทอง ✅ (2026-03-09, worktree)
- [x] เพิ่ม Footer link ไป `/privacy` ✅ (2026-03-09, worktree)
- [x] เพิ่ม Mobile hamburger menu → shared Navbar.tsx ✅ (2026-03-09)

**Phase 3: รูปภาพ (ทำใน 1 สัปดาห์)**
- [ ] สร้าง OG Image 1200x630px (`/public/og-default.jpg`) — Canva/Figma สีทอง #D4AF37
- [ ] ถ่าย product screenshot จาก Chrome Extension จริง 4 รูป (hero, step 1-3)
- [ ] สร้าง/หารูป pain section (AI-generated หรือ stock)
- [ ] อัพเดท paths ใน `hs-code.ts` ให้ชี้ไปรูปจริงแทน placehold.co

**Phase 4: Demo Video (ทำใน 1-3 เดือน)**
- [ ] ถ่าย screen recording 60-90 วินาที (OBS/Loom): Upload PDF → AI Scan → FTA → Magic Fill → Chat
- [ ] ใส่คำบรรยายไทย + background music royalty-free
- [ ] เปลี่ยน hero image เป็น `<video>` ใน `LandingTemplate.tsx`

**เรื่อง AES-256 Encryption at Rest:**
- ยังไม่ต้องทำตอนนี้ — HTTPS (encryption in transit) + RLS + backup เพียงพอสำหรับ startup ช่วงแรก
- AES-256 at rest กิน CPU เพิ่มแค่ ~2-5% (ไม่เกิน budget 2 CPU) แต่ PostgreSQL 16 ยังไม่มี built-in TDE
- **ทำเมื่อ:** มีลูกค้าจ่ายเงินจริง หรือ ลูกค้าองค์กรขอ compliance document — ตอนนั้นค่อยเปิด LUKS disk encryption บน VPS
- ระหว่างนี้เปลี่ยน label marketing เป็น "HTTPS ENCRYPTED" เพื่อไม่อ้างเกินจริง

---

### Production Auth + Subscription — Google OAuth + ระบบ Package/Pricing

**ทำไปทำไม:** ปิด `/login` บน production แล้ว → Extension login ไม่ได้ ต้องทำ login จริง + ระบบ package เพื่อรับลูกค้า

**สิ่งที่เสร็จแล้ว:**
- [x] DB Migration V8 — users, subscription_plans (FREE/PRO), tenant_subscriptions, tenant_usage
- [x] Google OAuth — `POST /v1/auth/google` verify Google ID token, auto-create tenant+user+FREE plan
- [x] Chrome Extension — Login with Google (`chrome.identity.launchWebAuthFlow`), ลบ email/password
- [x] ลบ AuthController (dev email/password) — ใช้ Google OAuth ทั้ง dev + prod
- [x] VPS `.env.production` — เพิ่ม GOOGLE_CLIENT_ID

**ทดสอบ (รอเจ้าของทดสอบเอง):**
- [x] Backend dev — endpoint ทำงาน (401 fake token, 400 empty body, V8 tables ครบ)
- [x] Backend production — deploy สำเร็จ, GOOGLE_CLIENT_ID ใส่แล้ว, endpoint ตอบ 401
- [x] แก้ Extension crash หน้าขาว — เพิ่ม Error Boundary + Dexie try-catch + filter undefined hsCode
- [ ] **รอเจ้าของทดสอบ:** ล้าง IndexedDB เก่า (F12 → Application → IndexedDB → Delete) → reload Extension → Login with Google → ลากไฟล์ scan
- [ ] **Rotate Google OAuth Client ID** — AI เผลอแสดง Client ID ใน chat ต้องสร้างใหม่ที่ Google Cloud Console → แก้ `.env` (local) + `.env.production` (VPS) + rebuild Extension

**สิ่งที่ต้องทำ (เรียงตามลำดับ):**
- [x] Usage Quota — atomic UPSERT, 429 + Thai upsell message, chat นับเฉพาะ RAG จริง ✅ (2026-03-09)
- [x] Admin upgrade API — `POST /v1/admin/upgrade` + X-Admin-Secret ✅ (2026-03-09)
- [x] Admin Plan CRUD API — `GET/POST/PUT /v1/admin/plans` จัดการ package ผ่าน API ✅ (2026-03-09)
- [x] Chrome Extension — QuotaExceededModal, UsageBadge (scan/chat remaining), 429 handling ✅ (2026-03-09)
- [x] Marketing Site — Pricing page (FREE / PRO 990 บาท) + shared Navbar/Footer ✅ (2026-03-09)

**Pricing:** FREE (10 scan + 3 chat) / PRO 990 บาท (100 ครั้งรวม) / เกินติดต่อ custom
**Payment Phase 1:** Manual — LINE OA + PromptPay (ยังไม่มีบริษัท)

---

### 🔍 Code Audit Findings (2026-03-09) — 7 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW

**ที่มา:** Full Audit โดย vollos-code-auditor (static analysis ทุก layer)

#### 🔴 CRITICAL — ✅ แก้ครบ (2026-03-09)
- [x] **C1: Gemini Hallucination** — แก้ไปก่อนหน้า (enrichWithHsCodes ใช้ semantic search แทน Gemini เดา)
- [x] **C2: Race Condition** — เพิ่ม `FOR UPDATE SKIP LOCKED` ใน job polling query
- [x] **C3: Prompt Injection** — strip zero-width chars (U+200B-200F, U+2060-2064, FEFF, soft hyphen) ก่อน regex check
- [x] **C4: NPE `.get(0)`** — เปลี่ยนเป็น safe `.path(0)` + check empty candidates ทั้ง 3 methods
- [x] **C5: Embedding dimension** — validate dimensions = 768, throw error ถ้าไม่ตรง
- [x] **C6: Admin permitAll()** — ลบ permitAll จาก SecurityConfig, admin ต้อง JWT authenticated
- [x] **C7: AdminController @Valid** — เพิ่ม `UpgradeRequest` + `CreatePlanRequest` records พร้อม @Valid, @NotBlank, @Min

#### 🟠 HIGH — ✅ แก้ครบ (2026-03-09)
- [x] **H1: `<all_urls>` web_accessible_resources** — ลบ `<all_urls>` เหลือแค่ `customs.go.th`
- [x] **H2: ChatGuardService Thai bypass** — strip zero-width chars (รวมกับ C3)
- [x] **H3: Race in embedAllHsCodes()** — ลบ @Transactional (Thread.sleep ภายใน transaction)
- [x] **H4: Null-unsafe semantic search** — null check code() + descriptionEn()
- [x] **H5: Python bare except** — แก้ 8 จุดใน 4 ไฟล์ เป็น specific exception + logging
- [x] **H6: Missing CSP header** — เพิ่ม Content-Security-Policy ใน nginx ทั้ง 2 server blocks

#### 🟡 MEDIUM — ✅ แก้ครบ (2026-03-09)
- [x] **M1+M2: Default secrets** — สร้าง SecretValidationConfig.java fail-fast บน production
- [x] **M3: postMessage null origin** — ลบ "null" จาก ALLOWED_ORIGINS + ลบ bypass condition
- [x] **M4: Unpinned Docker images** — pin n8n:1.76.1, minio RELEASE.2025-02-28, mc RELEASE.2025-02-21
- [x] **M5: Gemini error log** — เพิ่ม truncateForLog() log response body (cap 500 chars)
- [x] **M6: N+1 query** — pre-fetch chunked IDs ก่อน loop + เพิ่ม findSourceIdsBySourceType()
- [x] **M7: Empty catch blocks** — เพิ่ม log.warn ใน RagController + RagService SSE

#### 🟢 LOW — ✅ แก้ครบ (2026-03-09)
- [x] **L1: Content script `<all_urls>`** — ลบ `<all_urls>` (รวมกับ H1)
- [x] **L2: PGPASSWORD** — เพิ่ม comment warning + แนะนำ .pgpass
- [x] **L3: Clipboard error** — เพิ่ม console.warn แทน empty catch
- [x] **L4: GitLab CI SAST** — เพิ่ม sast job ใน test stage (dependencyCheckAnalyze)

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

(ว่าง)

---

## สิ่งที่เสร็จแล้ว

### Deploy & CI/CD
- [x] SHA-based deploy: docker-compose.prod.yml ใช้ `image:` จาก registry แทน `build:`

### Usage Quota + Pricing System (2026-03-09)
- [x] UsageQuotaService — atomic UPSERT นับ scan/chat, ตรวจโควต้า, chat นับเฉพาะ RAG จริง (ทักทายไม่นับ)
- [x] QuotaExceptionHandler — HTTP 429 + QUOTA_EXCEEDED response ภาษาไทย
- [x] GET /v1/usage — Extension เรียกดูโควต้าเหลือ
- [x] POST /v1/admin/upgrade — admin กดอัพเกรด tenant (X-Admin-Secret)
- [x] Chrome Extension — QuotaExceededModal, UsageBadge (progress bars สี), 429 handling
- [x] Marketing Site — Pricing page (FREE/PRO 990 บาท), shared Navbar + hamburger, shared Footer

### Scan HS Code Fix (2026-03-09)
- [x] ScanWorkerService: แยก Gemini extract items ออกจาก HS code classification
- [x] เพิ่ม enrichWithHsCodes() ใช้ semantic search จากฐานข้อมูลแทน Gemini เดา
- [x] ทดสอบผ่าน: ทุเรียน→0810.60.00 (sim 0.73), มังคุด→0804.50.30 (sim 0.79)

### Marketing Site Layout Fixes (2026-03-09)
- [x] ROADMAP badge styling สีเทาแยกจาก badge ทอง
- [x] Footer link ไป /privacy
- [x] Marketing Site Social Login + Privacy Policy (SQL fix, LeadForm→Google+LINE, PDPA page, OG Image)

### Data Pipeline Supplementary Embed (2026-03-09)
- [x] Embed 51 chunks ใหม่ (LPI 9 + Excise 42), total 4,729 chunks
- [x] Eval รัน 143 cases: 81% (test suite ยากขึ้น — regression จาก MFN duty N/A + red team bypass)

### ChatGuard — ระบบกรอง prompt injection / PII / off-topic ใน RAG Chat
- [x] Rate limit: 20 req/min/tenant (configurable via `customsguard.chat-guard.max-requests-per-minute` ใน application.yml)
- [x] GUARD_BLOCK structured log (category, keyword, tenant, query_prefix)
- [x] Hardening v2 — eval 141 cases, overall **89%**, Red Team 93%, false_positive 100%
  - Smoke test 5/5 PASS, GUARD_BLOCK log verified
- [x] Hardening v3 — 4 fixes: diacritic stripping, "ข้อมูลลับ"/"confidential" block, "customs official" keyword, "สูตร" off-topic + customs bypass
  - Red Team **100%** (was 93%), adversarial_offtopic **100%** (was 75%), obfuscation **100%** (was 67%)

### Data Pipeline + Hybrid RAG (2026-03-06)
- [x] Fix 1,230 heading-level HS codes: description_th was empty, Thai text was in description_en column
- [x] RAG eval improved: **89% → 92%** (+3%), 7 previously failing cases now pass
- [x] Hybrid RAG: RagService now searches both `cg_document_chunks` + `cg_hs_codes` (semantic + prefix lookup)
- [x] Fix "AD" false positive in UNAVAILABLE_TOPICS ("Additive" matched "AD")
- [x] All 4 persistent failures fixed: ui_004 (กุ้ง), ai_006 (แกะ/แพะ), ai_031 (สารลดแรงตึง), ai_045 (0101 sub-codes)
- [x] Eval baseline updated: ~90% (remaining ~10% is LLM flakiness, not data/code issue)

### RAG / Data Pipeline — ระบบค้นหากฎระเบียบศุลกากรด้วย AI
- [x] Phase 1: pgvector + HS Code semantic search (13,308 codes, hit rate 96.7%)
- [x] Phase 2: Document RAG — 25 regulations, 4,678 chunks, embeddings 100%
- [x] Phase 3: Chrome Extension integration (cache-first, intent filter, source citations, RagTipsBanner)

### FTA Data — อัตราภาษีสิทธิพิเศษจาก 9 FTA agreements
- [x] Scrape 13,754 FTA rates จาก thailandntr.com (9 FTA: RCEP, ACFTA, AIFTA, AJCEP, AKFTA, AANZFTA, JTEPA, TAFTA, TNZCEP)
- [x] Insert 12,752 rates เข้า Dev + Production DB
- [x] Validation passed: 0 orphan records, 100% embedding coverage
- [x] Dump: `data-pipeline/data/cg_dump_20260306_0527.sql.gz` (69MB)

### Security Hardening
- [x] JWT auth + SecurityConfig `anyRequest().denyAll()`
- [x] CORS restrict origins, non-root Docker, no-new-privileges
- [x] Nginx HSTS, rate limit auth 5r/m, modern ciphers
- [x] Secrets rotated on VPS, Gemini error masking

### Pre-Production Security Audit (2026-03-06)
- [x] Fix SQL Injection — `ScanWorkerService.java` `set_config()` string concat → parameterized query (2 จุด)
- [x] Fix AuthController — `@Profile("dev")` class-level ป้องกัน /login + /dev-token บน production
- [x] Mask Gemini logs — ลบ `response.body()` จาก error log ใน `GeminiChatService` + `GeminiEmbeddingService`
- [x] Correlation ID — `RequestTraceFilter.java` (MDC traceId + X-Request-Id header) + log pattern
- [x] IDOR defense-in-depth — `ScanController` เพิ่ม tenantId null guard
- [ ] .env permission บน VPS — `chmod 600 /opt/vollos/.env.production` (manual SSH)
- [ ] Backup restore test บน VPS — จำลอง restore แล้วตรวจ pgvector + RLS (manual SSH)
