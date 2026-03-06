# TODO — VOLLOS Backlog

Shared backlog visible to all AI tools and humans.
Updated: 2026-03-06

---

## สิ่งที่เหลือต้องทำ

### Data Pipeline — เติมข้อมูล HS Code ที่ยังขาด

**ทำไปทำไม:** RAG eval ผ่าน 84% แต่ fail 16 ข้อเพราะ DB ไม่มีข้อมูลหมวดเหล่านี้ เติมครบน่าจะดัน → 90%+

**Priority สูง (user ถามบ่อย):**
- [ ] คอมพิวเตอร์/อิเล็กทรอนิกส์ — คอมพิวเตอร์, กล่องหมึกเครื่องพิมพ์ (heading 8471, 8443)
- [ ] ยานยนต์/ชิ้นส่วน — ยางรถยนต์, เครื่องเกียร์, วงล้อ (heading 4011, 8708)

**Priority ปกติ:**
- [ ] สัตว์มีชีวิต — ม้า, ลา, ล่อ, แกะ, แพะ, สุกรทำพันธุ์, โคตัวผู้ตอน, ไก่ (heading 0101-0105)
- [ ] สิ่งทอ/เฟอร์นิเจอร์ — ม่าน (heading 6303, 6304)
- [ ] เคมีภัณฑ์ — สารลดแรงตึงผิว (heading 3402)

**เสร็จแล้วรัน:** `python 20_rag_eval_pipeline.py run` แล้ว `baseline` เพื่ออัพเดท baseline

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
