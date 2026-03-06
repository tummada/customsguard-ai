# TODO — VOLLOS Backlog

Shared backlog visible to all AI tools and humans.
Updated: 2026-03-06

---

## สิ่งที่เหลือต้องทำ

### Data Pipeline — ปรับ RAG quality ต่อ (eval 92%, เหลือ 11 fails)

**ทำไปทำไม:** eval ยังเหลือ 11 fails — ส่วนใหญ่เป็น RAG groundedness (ตอบไม่ตรงคำถาม)

**Remaining Failures:**
- [ ] ui_004: HS 0306.17.00 (กุ้ง) — RAG ไม่ดึง context ที่ตรง
- [ ] ks_009: พิกัดอาหารสุนัข — ไม่มี data
- [ ] ks_multi_003: เปรียบเทียบ MFN vs ACFTA เหล็กแผ่น — multi-step reasoning
- [ ] ks_multi_005: ภาษีฝั่งจีนสำหรับข้าว — out of scope (ไม่มี data ฝั่งจีน)
- [ ] scan_002: HS code ถูกไหม — scan context issue
- [ ] ai_003: โคตัวผู้ตอน HS Code — RAG ไม่ match
- [ ] ai_006: แกะ/แพะ HS Code — RAG ไม่ match
- [ ] ai_007: ม่าน HS Code — RAG ไม่ match
- [ ] ai_020: HS 0105.11.10 คือสินค้าประเภทใด — RAG ไม่ match
- [ ] ai_031: สารลดแรงตึงผิว — off-topic guard blocked (false positive?)
- [ ] ai_045: HS 0101 + sub-codes — RAG ไม่ match

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

### Production Auth + Subscription — Google OAuth + ระบบ Package/Pricing

**ทำไปทำไม:** ปิด `/login` บน production แล้ว → Extension login ไม่ได้ ต้องทำ login จริง + ระบบ package เพื่อรับลูกค้า

**แผนเสร็จแล้ว:** `.claude/plans/wiggly-doodling-snail.md` — พร้อมเริ่มทำ

**Scope:**
- [ ] DB Migration — users, subscription_plans (FREE/PRO), tenant_subscriptions, tenant_usage, audit_logs
- [ ] Google OAuth — verify ด้วย JWKS, auto-create tenant+user+FREE plan on first login
- [ ] Usage Quota — atomic increment, Caffeine cache, 429 + upsell message
- [ ] Admin upgrade API — manual upgrade หลังลูกค้าโอนเงิน
- [ ] Chrome Extension — Login with Google, QuotaExceededModal, Chat prompt suggestions + remaining count
- [ ] Marketing Site — Pricing page (2 plans: FREE / PRO 990 บาท)

**Pricing:** FREE (10 scan + 3 chat) / PRO 990 บาท (100 ครั้งรวม) / เกินติดต่อ custom
**Payment Phase 1:** Manual — LINE OA + PromptPay (ยังไม่มีบริษัท)

---

## 🔒 Active Plans (งานที่กำลังทำ — ห้าม session อื่นทำซ้ำ)

### 🔒 Marketing Site — แก้ bug + Social Login + เตรียม production (Claude Code session)

**AI ทำ:**
- [x] Fix SQL Injection + Transaction ใน `marketing-site/src/lib/db.ts`
- [x] Fix Tenant ID ใน `marketing-site/src/lib/leads.ts` (เปลี่ยนเป็น `a0000000-...`)
- [x] เปลี่ยน LeadForm → Google + LINE Login (`SocialLoginForm.tsx`)
- [x] เพิ่ม Privacy Policy page (PDPA แบบสั้น) — `marketing-site/src/app/privacy/page.tsx`
- [x] เพิ่ม `nurture_status` column — `V7__marketing_leads_nurture.sql`
- [x] เพิ่ม OG Image + Analytics placeholder ใน `layout.tsx`

**รอเจ้าของทำ (ต้องมี account/credential):**
- [x] สร้าง Google OAuth Client ID (console.cloud.google.com) → ใส่ `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ใน `.env`
- [x] สร้าง LINE Login Channel (developers.line.biz) → ใส่ `NEXT_PUBLIC_LINE_CLIENT_ID` + `LINE_CLIENT_SECRET` ใน `.env`
- [ ] สร้าง OG Image 1200x630px → วางที่ `marketing-site/public/og-default.jpg` (ใช้ Canva ฟรี, สี brand ทอง #D4AF37)
- [ ] สมัคร SendGrid → ใส่ credential ใน n8n สำหรับ welcome email (ทำทีหลังได้)
- [ ] สมัคร Plausible/GA4 → ใส่ `NEXT_PUBLIC_ANALYTICS_ID` ใน `.env` (ทำทีหลังได้)
- [ ] ถ่าย/สร้าง product screenshot จริง → แทน placeholder images (ทำทีหลังได้)

---

## สิ่งที่เสร็จแล้ว

### Deploy & CI/CD
- [x] SHA-based deploy: docker-compose.prod.yml ใช้ `image:` จาก registry แทน `build:`

### ChatGuard — ระบบกรอง prompt injection / PII / off-topic ใน RAG Chat
- [x] Rate limit: 20 req/min/tenant (configurable via `customsguard.chat-guard.max-requests-per-minute` ใน application.yml)
- [x] GUARD_BLOCK structured log (category, keyword, tenant, query_prefix)
- [x] Hardening v2 — eval 141 cases, overall **89%**, Red Team 93%, false_positive 100%
  - Smoke test 5/5 PASS, GUARD_BLOCK log verified
- [x] Hardening v3 — 4 fixes: diacritic stripping, "ข้อมูลลับ"/"confidential" block, "customs official" keyword, "สูตร" off-topic + customs bypass
  - Red Team **100%** (was 93%), adversarial_offtopic **100%** (was 75%), obfuscation **100%** (was 67%)

### Data Pipeline — fix heading-level description_th (2026-03-06)
- [x] Fix 1,230 heading-level HS codes: description_th was empty, Thai text was in description_en column
- [x] RAG eval improved: **89% → 92%** (+3%), 7 previously failing cases now pass
  - Fixed: ม้า/ลา/ล่อ, โคกระบือ, เครื่องเกียร์, ม่าน, เครื่องสำอาง, แบตเตอรี่, รถยนต์ไฟฟ้า FTA

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
