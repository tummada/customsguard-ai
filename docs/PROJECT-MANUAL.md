# คู่มือโปรเจกต์ VOLLOS — CustomsGuard AI

> **สำหรับ:** เจ้าของโปรเจกต์ (Owner Reference Manual)
> **อัปเดตล่าสุด:** 2026-03-09
> **สถานะ:** Production-ready, รอ Beta Testing

---

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [โครงสร้างโฟลเดอร์](#2-โครงสร้างโฟลเดอร์)
3. [Backend — Spring Boot Modular Monolith](#3-backend--spring-boot-modular-monolith)
4. [Chrome Extension — หน้าจอผู้ใช้](#4-chrome-extension--หน้าจอผู้ใช้)
5. [Marketing Site — เว็บไซต์การตลาด](#5-marketing-site--เว็บไซต์การตลาด)
6. [Data Pipeline — ขั้นตอนสร้างข้อมูล RAG](#6-data-pipeline--ขั้นตอนสร้างข้อมูล-rag)
7. [ฟีเจอร์ทั้งหมด (Dev แล้ว vs ยังไม่ Dev)](#7-ฟีเจอร์ทั้งหมด)
8. [RAG — ระบบค้นหาอัจฉริยะ](#8-rag--ระบบค้นหาอัจฉริยะ)
9. [ระบบ Multi-Tenancy & Security](#9-ระบบ-multi-tenancy--security)
10. [Docker & Infrastructure](#10-docker--infrastructure)
11. [CI/CD — การ Deploy](#11-cicd--การ-deploy)
12. [Content Marketing System](#12-content-marketing-system)
13. [n8n Workflows — Automation](#13-n8n-workflows--automation)
14. [คำสั่ง Dev ที่ใช้บ่อย](#14-คำสั่ง-dev-ที่ใช้บ่อย)
15. [Checklist ก่อนให้ลูกค้าทดลอง](#15-checklist-ก่อนให้ลูกค้าทดลอง)
16. [Roadmap & สิ่งที่ต้องทำต่อ](#16-roadmap--สิ่งที่ต้องทำต่อ)

---

## 1. ภาพรวมโปรเจกต์

### VOLLOS คืออะไร?

VOLLOS เป็น **AI-SaaS Platform** สำหรับงานศุลกากร ฟีเจอร์หลักคือ **CustomsGuard** — ระบบ AI ที่ช่วยจำแนกพิกัดศุลกากร (HS Code) จากเอกสาร PDF อัตโนมัติ

### ปัญหาที่แก้

| ปัญหาเดิม | VOLLOS แก้ยังไง |
|-----------|----------------|
| กรอกใบขนสินค้า 3 ชม./ฉบับ | AI scan + Magic Fill เหลือ 2 นาที |
| เสี่ยงเลือก HS Code ผิด → ถูกปรับ | Semantic search จาก DB จริง 12,000+ รหัส |
| ไม่รู้สิทธิ FTA ที่ได้ | ระบบแจ้ง FTA rate อัตโนมัติ (ACFTA, CPTPP ฯลฯ) |
| ตรวจสอบใบอนุญาต LPI ยาก | AI แจ้งเตือนว่าสินค้าต้องมีใบอนุญาตอะไร |
| เปิดหลายเว็บค้นหากฎระเบียบ | RAG search ค้นจากกฎระเบียบ 25+ ฉบับ |

### Tech Stack

```
Backend:    Java 21 + Spring Boot 3.5 + GraalVM (Modular Monolith)
Database:   PostgreSQL 16 + pgvector (vector search)
Cache:      Redis 7
Storage:    S3 / MinIO (PDF files)
AI:         Google Gemini 2.5 Flash (chat) + gemini-embedding-001 (embedding)
Frontend:   Chrome Extension (React 19 + TypeScript + Vite)
Website:    Next.js 16 + Tailwind CSS 4
Automation: n8n (workflow orchestration)
Deploy:     Docker Compose on VPS (2 CPU / 8 GB RAM)
CI/CD:      GitLab CI → SSH deploy to Hostinger VPS
```

### สถาปัตยกรรมแบบย่อ

```
ผู้ใช้ (Browser)
    ↓
Chrome Extension (React 19)
    ↓ REST API + JWT
Nginx (reverse proxy + rate limit + SSL)
    ↓
Spring Boot Backend
    ├── platform-core (multi-tenancy, JWT, RLS)
    ├── platform-app (entry point)
    └── feature-customsguard (HS code, RAG, scan)
        ├── → PostgreSQL 16 + pgvector
        ├── → Redis 7 (cache + rate limit)
        ├── → MinIO/S3 (PDF storage)
        └── → Google Gemini API (AI)

Marketing Site (Next.js 16) → แยก container
n8n (workflow automation) → แยก container
```

---

## 2. โครงสร้างโฟลเดอร์

```
aiservice/
├── backend-core/                  # ← Backend ทั้งหมด (Java)
│   ├── platform-core/             #    โค้ดแชร์: multi-tenancy, JWT, security
│   ├── platform-app/              #    จุดเริ่มต้นแอป (bootable)
│   └── feature-customsguard/      #    ฟีเจอร์หลัก: HS code, RAG, scan
│
├── chrome-extension/cgai/         # ← Chrome Extension (React 19)
│   ├── src/sidepanel/             #    UI หลัก (scan, chat, magic fill)
│   ├── src/content/               #    inject เข้าหน้าเว็บ customs.go.th
│   ├── src/background/            #    service worker
│   └── src/lib/                   #    API client, Dexie DB, i18n
│
├── marketing-site/                # ← เว็บการตลาด (Next.js 16)
│   ├── src/app/                   #    pages: landing, blog, tools, pricing
│   └── src/components/            #    UI components
│
├── data-pipeline/                 # ← Python scripts สร้างข้อมูล RAG
│   ├── 00-14_*.py                 #    collect → parse → embed → dump
│   ├── 20_rag_eval_pipeline.py    #    ทดสอบคุณภาพ RAG (เป้า >95%)
│   ├── collectors/                #    download ข้อมูลจากราชการ
│   └── utils/                     #    helper functions
│
├── infra/                         # ← Nginx config, n8n workflows, SSL
├── docs/                          # ← เอกสารโปรเจกต์ทั้งหมด
├── test-data/                     # ← ข้อมูลทดสอบ E2E
│
├── docker-compose.yml             # ← Production stack (VPS)
├── docker-compose.dev.yml         # ← Dev stack (local)
├── Dockerfile                     # ← สร้าง backend image
├── .gitlab-ci.yml                 # ← CI/CD pipeline
├── .env                           # ← ค่า secret (ห้ามเข้า git!)
├── TODO.md                        # ← Backlog งานที่ต้องทำ
└── CLAUDE.md                      # ← คำสั่งให้ AI ปฏิบัติตาม
```

---

## 3. Backend — Spring Boot Modular Monolith

### หลักการออกแบบ

Backend ใช้ **Modular Monolith** — โค้ดอยู่ใน repo เดียว แต่แยกเป็น module ที่ปลั๊กอินได้:

```
platform-core  ← ฐานรากทุกอย่าง (ทุก module ใช้ร่วม)
     ↑
platform-app   ← จุดเริ่มต้น (ดึง module ทั้งหมดเข้ามา)
     ↑
feature-customsguard  ← ฟีเจอร์ (ต่อเข้าอัตโนมัติ)
```

> ถ้าจะเพิ่มฟีเจอร์ใหม่ในอนาคต (เช่น `feature-logistics`) → สร้าง module ใหม่ตาม pattern เดียวกัน ไม่ต้องแก้ module อื่น

### 3.1 platform-core — ฐานราก

**ทำอะไรได้:**
- **Multi-Tenancy:** ทุก request ต้องมี `X-Tenant-ID` header → ข้อมูลแยกตามลูกค้าอัตโนมัติ (RLS)
- **JWT Authentication:** ระบบล็อกอินด้วย token (24 ชม. หมดอายุ)
- **Google OAuth:** Login with Google (ใช้จริง production)
- **Security:** Spring Security + CORS + rate limiting
- **Flyway Migration:** จัดการ schema database อัตโนมัติ
- **UUID v7:** สร้าง ID เรียงตามเวลา (ดีกว่า UUID v4)
- **Feature Registry:** ค้นหาและลงทะเบียน feature module อัตโนมัติ
- **Usage Quota:** ระบบจำกัดจำนวน scan/chat ต่อเดือนตาม plan (atomic UPSERT)
- **Admin API:** จัดการ subscription plans + upgrade tenant ผ่าน API (X-Admin-Secret)

**ไฟล์สำคัญ:**

| ไฟล์ | ทำอะไร |
|------|--------|
| `SecurityConfig.java` | ตั้งค่า JWT filter, CORS, endpoint protection |
| `JwtTokenProvider.java` | สร้าง/ตรวจสอบ JWT token |
| `TenantInterceptor.java` | ดึง tenant ID จาก header |
| `TenantConnectionInterceptor.java` | set tenant ใน PostgreSQL connection |
| `GoogleAuthController.java` | OAuth 2.0 login endpoint |
| `UsageQuotaService.java` | ตรวจ + นับโควต้า scan/chat (atomic UPSERT) |
| `UsageController.java` | `GET /v1/usage` — ดูโควต้าคงเหลือ |
| `AdminController.java` | Admin API: upgrade tenant, CRUD plans |
| `QuotaExceptionHandler.java` | HTTP 429 เมื่อโควต้าเกิน + ข้อความไทย |
| `FlywayFeatureConfig.java` | รวม migration จากทุก feature module |
| `FeatureRegistry.java` | ค้นหา feature module ตอน startup |
| `UUIDv7.java` | สร้าง UUID v7 |

**Database Migrations (Core — V1-V8):**

| Version | สร้างอะไร |
|---------|----------|
| V1 | ตาราง tenants, users, ai_jobs, platform_features + RLS |
| V2-V3 | ตาราง marketing leads |
| V4 | feature subscription (tenant ↔ feature) |
| V5 | seed dev tenant (`a0000000-...0001`) |
| V6 | content marketing (mkt_content) |
| V7 | marketing leads nurture |
| V8 | Google Auth users + subscription_plans (FREE/PRO) + tenant_subscriptions + tenant_usage |

### 3.3 Admin API — จัดการ Plans & Subscriptions

Endpoint ทั้งหมดใช้ `X-Admin-Secret` header ป้องกัน (ค่า secret อยู่ใน `.env`)

| Method | Endpoint | ทำอะไร |
|--------|----------|--------|
| `GET` | `/v1/admin/plans` | ดู subscription plans ทั้งหมด |
| `POST` | `/v1/admin/plans` | สร้าง plan ใหม่ (id, displayName, scanLimit, chatLimit, priceThb) |
| `PUT` | `/v1/admin/plans/{id}` | แก้ไข plan (ส่งเฉพาะ field ที่จะเปลี่ยน) |
| `POST` | `/v1/admin/upgrade` | อัพเกรด tenant ไป plan อื่น |
| `GET` | `/v1/usage` | ดูโควต้าคงเหลือของ tenant (scan/chat used/limit) |

**ตัวอย่างการใช้งาน:**

```bash
# ดู plans ทั้งหมด
curl -H "X-Admin-Secret: <secret>" http://localhost:8080/v1/admin/plans

# แก้ PRO เป็น 200 scan
curl -X PUT -H "X-Admin-Secret: <secret>" -H "Content-Type: application/json" \
  http://localhost:8080/v1/admin/plans/PRO -d '{"scanLimit": 200}'

# สร้าง package ใหม่
curl -X POST -H "X-Admin-Secret: <secret>" -H "Content-Type: application/json" \
  http://localhost:8080/v1/admin/plans \
  -d '{"id":"ENTERPRISE","displayName":"Enterprise","scanLimit":1000,"chatLimit":500,"priceThb":4990}'

# อัพเกรด tenant
curl -X POST -H "X-Admin-Secret: <secret>" -H "Content-Type: application/json" \
  http://localhost:8080/v1/admin/upgrade \
  -d '{"tenantId":"<uuid>","planId":"PRO"}'
```

**Pricing Plans (default):**

| Plan | Scan/เดือน | Chat/เดือน | ราคา |
|------|-----------|-----------|------|
| FREE | 10 | 3 | ฟรี |
| PRO | 100 | 100 | 990 บาท |

> **หมายเหตุ:** Chat นับเฉพาะคำถามที่ต้อง RAG search จริง — ทักทาย/สวัสดี ไม่นับโควต้า

### 3.4 feature-customsguard — ฟีเจอร์หลัก

นี่คือหัวใจของระบบ ทุกอย่างเกี่ยวกับ HS Code, Scan, RAG อยู่ที่นี่

#### API Endpoints

| Method | Endpoint | ทำอะไร |
|--------|----------|--------|
| `POST` | `/v1/customsguard/scan` | อัปโหลด PDF → AI วิเคราะห์ HS Code |
| `GET` | `/v1/customsguard/scan/{jobId}` | เช็คสถานะ scan job |
| `GET` | `/v1/customsguard/hs-codes` | ดูรายการ HS Code ทั้งหมด |
| `POST` | `/v1/customsguard/hs-codes/semantic` | ค้นหา HS Code ด้วย AI (semantic search) |
| `POST` | `/v1/customsguard/hs-codes/embed-all` | สร้าง embedding ใหม่ทั้งหมด |
| `POST` | `/v1/customsguard/hs-codes/seed` | เติมข้อมูล HS Code ตัวอย่าง |
| `POST` | `/v1/customsguard/hs/lookup` | ค้นหา FTA rate + LPI แบบ batch |
| `POST` | `/v1/customsguard/rag/search` | ค้นหาข้อมูลกฎระเบียบ (RAG) |
| `POST` | `/v1/customsguard/rag/stream` | ค้นหา RAG แบบ streaming (SSE) |
| `GET` | `/v1/customsguard/exchange-rates` | อัตราแลกเปลี่ยน (cached 24 ชม.) |

#### Services (ตัวทำงานจริง)

| Service | หน้าที่ |
|---------|--------|
| **ScanService** | รับ PDF → เก็บใน S3 → สร้าง job (status=CREATED) |
| **ScanWorkerService** | ทำงาน background ทุก 15 วินาที — ดึง PDF จาก S3 → OCR → ส่ง Gemini วิเคราะห์ → เก็บผลลัพธ์ |
| **HsCodeService** | จัดการข้อมูล HS Code + semantic search ด้วย pgvector |
| **RagService** | ค้นหาข้อมูลกฎระเบียบจาก document chunks → ส่ง Gemini สรุปคำตอบ |
| **GeminiEmbeddingService** | เรียก Gemini API สร้าง vector 768 มิติ |
| **GeminiChatService** | เรียก Gemini 2.5 Flash สำหรับ chat/สรุปคำตอบ |
| **ChatGuardService** | ป้องกัน: rate limit (5 req/min), prompt injection, PII filter |
| **HsLookupService** | ค้นอัตรา FTA + เช็คใบอนุญาต LPI |
| **PdfProcessingService** | OCR: PDFBox (text) → Gemini Vision (ถ้าเป็นภาพ scan) |
| **S3StorageService** | จัดการไฟล์บน S3/MinIO |
| **DocumentChunkService** | ตัดเอกสารเป็นชิ้น 512 token → embed → เก็บ pgvector |

#### ขั้นตอนการ Scan PDF (สำคัญ!)

```
1. ผู้ใช้ลาก PDF ลงใน Extension
   ↓
2. Extension ส่ง PDF ไป POST /v1/customsguard/scan
   ↓
3. ScanController:
   - ตรวจขนาดไฟล์ (≤ 10 MB)
   - ตรวจ declarationType (IMPORT/EXPORT/TRANSIT)
   - เก็บ PDF ใน S3 (MinIO)
   - สร้าง ai_jobs record (status = CREATED)
   - return 202 Accepted + jobId
   ↓
4. ScanWorkerService (ทำงาน background ทุก 15 วินาที):
   - ดึง job ที่ status = CREATED
   - ดาวน์โหลด PDF จาก S3
   - ดึงข้อความ: PDFBox → ถ้าไม่ได้ → Gemini Vision (ภาพ scan)
   - ส่งข้อความไป Gemini 2.5 Flash → สกัดรายการสินค้า
   - สำหรับแต่ละสินค้า: semantic search จาก HS Code DB จริง
     (ไม่ให้ Gemini เดา HS Code เอง!)
   - Retry 3 ครั้ง ถ้า Gemini ตอบว่าง (รอ 15 วินาที)
   - อัปเดต job → COMPLETED + ผลลัพธ์
   - Auto lookup FTA rates ให้ทุกสินค้า
   ↓
5. Extension poll GET /scan/{jobId} ทุก 2 วินาที
   ↓
6. แสดงผลลัพธ์: HS Code, description, duty rate, FTA savings
```

#### Database Migrations (Feature — V1000-V1012)

| Version | สร้างอะไร |
|---------|----------|
| V1000 | ตาราง cg_hs_codes, cg_declarations + RLS |
| V1001 | เพิ่ม vector column (768 dims) + HNSW index |
| V1002 | Global refactor (HS codes ไม่ต้องมี tenant_id) |
| V1003 | Knowledge base: cg_documents, cg_document_chunks |
| V1004 | แก้ updated_at column |
| V1005 | Pipeline state tracking + source_url |
| V1006 | ตาราง FTA rates, LPI controls, regulations, exchange rates |
| V1007 | Seed ข้อมูล FTA (CPTPP, ACFTA, ACIA ฯลฯ) |
| V1008 | Seed ข้อมูล LPI controls |
| V1009 | ตาราง exchange rates |
| V1010-V1011 | Seed ข้อมูลกฎระเบียบ |
| V1012 | Supplementary data + RLS |

#### Entities (ตาราง DB ที่สำคัญ)

| Entity | ตาราง | ข้อมูล |
|--------|-------|--------|
| HsCodeEntity | cg_hs_codes | พิกัด HS 12,000+ รายการ (code, description TH/EN, base_rate) |
| DocumentChunkEntity | cg_document_chunks | เนื้อหากฎระเบียบที่ตัดเป็นชิ้นๆ + vector embedding |
| FtaRateEntity | cg_fta_rates | อัตราภาษี FTA (CPTPP, ACFTA ฯลฯ) |
| LpiControlEntity | cg_lpi_controls | ใบอนุญาตนำเข้า (LPI) |
| RegulationEntity | cg_regulations | กฎระเบียบศุลกากร |
| ExchangeRateEntity | cg_exchange_rates | อัตราแลกเปลี่ยน |
| CustomsDeclarationEntity | cg_declarations | ใบขนสินค้าของผู้ใช้ (tenant-scoped) |

---

## 4. Chrome Extension — หน้าจอผู้ใช้

### มันคืออะไร?

Chrome Extension ที่เปิดเป็น **Side Panel** ข้างหน้าเว็บ customs.go.th — ผู้ใช้ลาก PDF แล้ว AI จะวิเคราะห์ให้ แล้วกดปุ่มเดียวกรอกฟอร์มอัตโนมัติ

### โครงสร้างไฟล์

```
chrome-extension/cgai/
├── manifest.json              # ← กำหนด permission, host, service worker
├── src/
│   ├── sidepanel/             # ← UI หลัก (แสดงเป็น side panel)
│   │   ├── main.tsx           #    React app entry
│   │   ├── App.tsx            #    Layout + tabs (Scan, Chat, Magic Fill)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx #    จัดการ login/token/tenant
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx       # หน้า login (Google OAuth)
│   │   │   ├── ScanPanel.tsx         # หน้า scan PDF (drag-drop)
│   │   │   ├── ChatPanel.tsx         # หน้า chat ถาม AI
│   │   │   ├── PdfDropZone.tsx       # ที่ลาก PDF
│   │   │   ├── LineItemTable.tsx     # ตารางผลลัพธ์ scan
│   │   │   ├── FtaAlertBanner.tsx    # แจ้ง FTA savings
│   │   │   ├── LpiAlertBanner.tsx    # แจ้งใบอนุญาต
│   │   │   ├── RagTipsBanner.tsx     # แสดงผล RAG search
│   │   │   ├── ExchangeRateBanner.tsx # อัตราแลกเปลี่ยน
│   │   │   ├── TrafficLight.tsx      # สัญญาณไฟ (เขียว/เหลือง/แดง)
│   │   │   ├── LanguageToggle.tsx    # เปลี่ยนภาษา TH/EN
│   │   │   ├── QuotaExceededModal.tsx # แจ้งโควต้าเกิน + ปุ่ม Upgrade
│   │   │   └── UsageBadge.tsx        # แสดงโควต้าเหลือ (scan/chat bars)
│   │   └── hooks/
│   │       ├── useScanItems.ts       # จัดการ scan job polling
│   │       ├── useExchangeRates.ts   # ดึงอัตราแลกเปลี่ยน
│   │       ├── useAuditRisk.ts       # คำนวณคะแนนเสี่ยง audit
│   │       └── useUsage.ts           # ดึงโควต้า GET /v1/usage
│   │
│   ├── content/               # ← Inject เข้าหน้าเว็บ
│   │   └── engine.ts          #    ตรวจจับฟอร์ม customs.go.th, Magic Fill
│   │
│   ├── background/            # ← Service Worker
│   │   └── index.ts           #    จัดการ message passing
│   │
│   └── lib/                   # ← Shared Libraries
│       ├── api-client.ts      #    HTTP client + JWT + caching
│       ├── db.ts              #    Dexie (IndexedDB) cache
│       └── pdf-renderer.ts    #    แสดง PDF preview
│
└── dist/                      # ← Build output (load ใน Chrome)
```

### การทำงานของ Extension

```
1. ผู้ใช้เปิด customs.go.th
   ↓
2. Content script (engine.ts) ตรวจจับว่าอยู่บนเว็บศุลกากร
   ↓
3. ผู้ใช้เปิด Side Panel (คลิกไอคอน extension)
   ↓
4. ถ้ายังไม่ login → แสดง LoginScreen (Google OAuth)
   ↓
5. login สำเร็จ → token เก็บใน chrome.storage.session
   (ปิด browser = token หมด = ต้อง login ใหม่ — ปลอดภัย)
   ↓
6. แสดง ScanPanel → ลาก PDF ลงมา
   ↓
7. ส่ง PDF ไป backend → รอผล (poll ทุก 2 วินาที)
   ↓
8. แสดงผลในตาราง + แจ้งเตือน FTA/LPI/Risk
   ↓
9. ผู้ใช้ตรวจสอบ → กด Magic Fill
   ↓
10. Content script inject ค่าลงฟอร์ม customs.go.th
```

### ระบบ Cache (ประหยัด API calls)

| ข้อมูล | เก็บที่ | TTL | เหตุผล |
|--------|---------|-----|--------|
| FTA rates | Dexie (IndexedDB) | 24 ชม. | เปลี่ยนตามประกาศ |
| RAG results | Dexie | 12 ชม. | knowledge base อัปเดตไม่บ่อย |
| LPI controls | Dexie | 7 วัน | เปลี่ยนน้อยมาก |
| Exchange rates | Dexie | 24 ชม. | อัปเดตรายวัน |

---

## 5. Marketing Site — เว็บไซต์การตลาด

### เอาไว้ทำอะไร?

เว็บไซต์หน้าร้านสำหรับ:
1. **Landing Page** — แนะนำสินค้า, แสดง ROI, CTA ให้สมัคร
2. **Blog** — บทความ SEO เรื่องศุลกากร (Topical Authority)
3. **HS Lookup Tool** — เครื่องมือค้นหา HS Code ฟรี (Citation Bait → ดึงคนเข้าเว็บ)
4. **Pricing** — หน้าราคา FREE / PRO 990 บาท
5. **Privacy Policy** — นโยบายความเป็นส่วนตัว
6. **Google OAuth Login** — สมัครสมาชิก/เข้าสู่ระบบ

### โครงสร้างไฟล์

```
marketing-site/
├── src/app/
│   ├── page.tsx                        # Root → redirect ไป /c
│   ├── layout.tsx                      # Global layout (Navbar, Footer)
│   ├── c/page.tsx                      # Landing page หลัก
│   ├── [product]/
│   │   ├── blog/page.tsx               # รายการบทความ
│   │   ├── blog/[slug]/page.tsx        # หน้าบทความ
│   │   └── tools/hs-lookup/page.tsx    # เครื่องมือค้น HS Code ฟรี
│   ├── pricing/page.tsx                # หน้าราคา
│   └── privacy/page.tsx                # Privacy Policy
│
├── src/components/
│   ├── Navbar.tsx                      # แถบนำทาง
│   ├── Footer.tsx                      # ส่วนท้าย
│   ├── LandingTemplate.tsx             # Hero section + CTA
│   ├── RoiShowcase.tsx                 # ตาราง ROI (ประหยัดเงิน/เวลา)
│   ├── SocialLoginForm.tsx             # ปุ่ม Login with Google / LINE
│   ├── StructuredData.tsx              # Schema.org (SEO)
│   ├── FaqAccordion.tsx                # FAQ section
│   ├── BeforeAfterTable.tsx            # เปรียบเทียบก่อน-หลัง
│   ├── BentoCard.tsx                   # Bento grid
│   ├── Icons.tsx                       # SVG icons
│   └── GrainNoise.tsx                  # พื้นหลัง texture
│
├── src/lib/
│   ├── content.ts                      # ดึงบทความจาก DB
│   ├── db.ts                           # PostgreSQL connection
│   └── leads.ts                        # CRM operations
│
└── public/
    └── og-default.jpg                  # OG Image (social share)
```

### กลยุทธ์ SEO

| กลยุทธ์ | วิธีทำ |
|---------|--------|
| **Topical Authority** | เขียน 30-50 บทความเรื่องศุลกากร/HS Code |
| **Citation Bait** | เครื่องมือค้น HS Code ฟรี → คนแชร์ลิงก์ |
| **Schema.org** | ติด structured data (DefinedTermSet, Article) → Google แสดง rich results |
| **E-E-A-T** | อ้างอิง customs.go.th, ใส่ customs_verify_url ทุกบทความ |
| **Weekly Freshness** | n8n auto-publish บทความใหม่ทุกสัปดาห์ |

---

## 6. Data Pipeline — ขั้นตอนสร้างข้อมูล RAG

### ภาพรวม

Data Pipeline เป็นชุด Python scripts ที่ **รวบรวมข้อมูลศุลกากรจากหลายแหล่ง → ประมวลผล → สร้าง embedding → เก็บลง PostgreSQL** ให้ RAG ค้นหาได้

### ขั้นตอนทั้งหมด (เรียงตามลำดับ)

```
Phase 1: รวบรวมข้อมูล (FREE)
═══════════════════════════
00_collect_raw_data.py
  → ดาวน์โหลด CSV จาก data.go.th, customs.go.th
  → ได้: HS Code 12,000+ รายการ, กฎระเบียบ PDF

Phase 2: ประมวลผล HS Code
═════════════════════════
01_parse_hs_codes_csv.py      → แปลง CSV → INSERT ลง cg_hs_codes
01b_parse_hs_realdata.py      → แปลง PDF ราชการ → ข้อมูล HS Code
01c_fast_insert.py            → Batch insert (เร็วกว่า)
02_extract_hs_from_pdf.py     → Gemini Vision อ่าน PDF scan (มีค่าใช้จ่าย)
03_embed_hs_codes.py          → สร้าง embedding ทุก HS Code (Gemini free tier)

Phase 3: ข้อมูลเสริม (FTA + กฎระเบียบ)
═══════════════════════════════════════
04_parse_fta_rates.py         → แปลง FTA CSV → cg_fta_rates
04b_fetch_fta_api.py          → ดึงจาก customs API
04c-04g                       → Scrape FTA จากเว็บต่างๆ (Playwright)
05_parse_ecs_regulations.py   → กฎระเบียบ ECS
06_extract_rulings_pdf.py     → คำวินิจฉัย (Gemini Vision)
06b_parse_antidumping.py      → ข้อมูล AD/CVD duty

Phase 4: LPI + ข้อมูลเพิ่มเติม
════════════════════════════════
07b_parse_licenses.py         → ใบอนุญาตนำเข้า (LPI)
09b_parse_supplementary.py    → ข้อมูลเสริม 21,000+ records

Phase 5: RAG Enrichment (ค่าใช้จ่ายมากที่สุด)
═══════════════════════════════════════════════
07_chunk_and_embed.py         → ตัดเอกสาร 512 token + embed
08_enrich_summaries.py        → Gemini สรุปเนื้อหาแต่ละ chunk
09_generate_synthetic_qa.py   → สร้าง Q&A จำลอง (ใช้ทดสอบ)
10_cross_reference.py         → เชื่อมโยง HS Code ↔ กฎระเบียบ
10_embed_supplementary.py     → Embed ข้อมูลเสริม

Phase 6: ตรวจสอบ + Export
═════════════════════════
11_quality_check.py           → ตรวจคุณภาพ embedding + coverage
12_optimize_indexes.py        → สร้าง HNSW index, ANALYZE
13_pg_dump.sh                 → Export เป็น SQL dump
14_pg_restore.sh              → Restore ลง local dev

Phase 7: ประเมินคุณภาพ
══════════════════════
20_rag_eval_pipeline.py       → Hybrid search + FTA context + threshold
                                 LLM-as-judge → เป้า >95% (ปัจจุบัน ~94%)
```

### แหล่งข้อมูล

| แหล่ง | ข้อมูลที่ได้ | วิธีเข้าถึง |
|-------|-------------|-------------|
| data.go.th | HS Code CSV | REST API (ฟรี) |
| customs.go.th | กฎระเบียบ, คำวินิจฉัย | Web scrape + PDF download |
| thailandntr.com | อัตราภาษี FTA | Web scrape |
| tax.dtn.go.th | อัตราภาษี Excise | Web scrape |
| ecs-support.github.io | กฎระเบียบ ECS | Direct download |

### ค่าใช้จ่าย (GCP $300 credit)

| รายการ | ค่าใช้จ่าย/เดือน |
|--------|-----------------|
| Cloud SQL (PostgreSQL) | ~$9 |
| VM (e2-small) | ~$15 |
| Storage | ~$1 |
| **เหลือ → Vertex AI** | **~$275** |

> **หมายเหตุ:** Embedding ใช้ Google AI Studio free tier ได้ แต่ Vision + Chat ต้องใช้ Vertex AI (คิดเงิน)

---

## 7. ฟีเจอร์ทั้งหมด

### Blueprint 14 ฟีเจอร์ (จาก Feature Spec)

#### กลุ่ม 1: ความเร็ว & ประสิทธิภาพ

| # | ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---------|--------|-----------|
| 1 | **Smart Side-Panel & Magic Fill** | ✅ Dev แล้ว | เปิด side panel ข้าง customs.go.th, กดปุ่มกรอกฟอร์มอัตโนมัติ |
| 2 | **Universal Drag-and-Drop Scan** | ✅ Dev แล้ว | ลาก PDF → AI อ่าน OCR + Vision → สกัด HS Code |
| 3 | AI Line-Item Consolidator | ❌ ยังไม่ Dev | รวมรายการซ้ำ, คำนวณปริมาณ/น้ำหนักรวม |
| 4 | Auto-Freight & Insurance Proration | ❌ ยังไม่ Dev | คำนวณ CIF อัตโนมัติ (กระจายค่าขนส่ง/ประกัน) |
| 5 | **Semantic Document Search** | ✅ Dev แล้ว | ค้นหากฎระเบียบด้วย AI (RAG search) |

#### กลุ่ม 2: ความถูกต้อง & ป้องกันความเสี่ยง

| # | ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---------|--------|-----------|
| 6 | **AI-Driven Audit List** | 🔨 กำลัง Dev | ระบบไฟจราจร (เขียว/เหลือง/แดง) แจ้งเตือนความเสี่ยง |
| 7 | Post-Audit Ghost | ❌ ยังไม่ Dev | จำลองการตรวจสอบจากศุลกากร |
| 8 | **LPI One-Click Checklist** | ✅ Dev แล้ว | แจ้งว่าสินค้าต้องมีใบอนุญาตอะไรบ้าง |
| 9 | **AI Exchange Rate Lock** | ✅ Dev แล้ว | ใช้อัตราแลกเปลี่ยนของกรมศุลกากร (cached 24 ชม.) |

#### กลุ่ม 3: ผลกำไร & กลยุทธ์

| # | ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---------|--------|-----------|
| 10 | **Privilege Optimizer (FTA Alert)** | ✅ Dev แล้ว | แจ้ง FTA rate ที่ประหยัดภาษีได้ (ACFTA, CPTPP ฯลฯ) |
| 11 | Duty Drawback Tracer | ❌ ยังไม่ Dev | ช่วยเคลมคืนภาษี (re-export) |
| 12 | Smart HS-Code Defense Generator | ❌ ยังไม่ Dev | สร้างเหตุผลทางกฎหมายรองรับ HS Code ที่เลือก |
| 13 | Supplier Integrity Checker | ❌ ยังไม่ Dev | ตรวจราคา/ชื่อผู้ขายผิดปกติ |

#### กลุ่ม 4: การจัดการ & ควบคุม

| # | ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---------|--------|-----------|
| 14 | **Usage Logs & Anti-Fraud** | ✅ Dev แล้ว | Usage quota (scan/chat limit ตาม plan) + Admin API จัดการ plans |

### สรุปสถานะ

```
✅ Dev แล้ว:      8 ฟีเจอร์ (#1, #2, #5, #8, #9, #10, #14 + Google OAuth + ChatGuard)
🔨 กำลัง Dev:     1 ฟีเจอร์ (#6)
❌ ยังไม่ Dev:     5 ฟีเจอร์ (#3, #4, #7, #11, #12, #13)
```

### ฟีเจอร์เสริมที่ Dev แล้ว (ไม่อยู่ใน Blueprint 14)

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **Google OAuth** | Login with Google (production-ready) |
| **ChatGuardService** | Rate limit 5 req/min, prompt injection filter, PII masking |
| **ScanWorker Retry** | Retry 3 ครั้ง ถ้า Gemini ตอบว่าง |
| **Content Marketing** | Blog system + HS Lookup tool + Schema.org |
| **Usage Quota System** | จำกัด scan/chat ต่อเดือนตาม plan, HTTP 429 เมื่อเกิน |
| **Admin Plan CRUD** | GET/POST/PUT /v1/admin/plans — จัดการ package ผ่าน API |
| **Pricing Page** | หน้าราคา FREE/PRO + shared Navbar/Footer |
| **Data Pipeline** | Python scripts รวบรวมข้อมูล RAG 21,000+ records |
| **RAG Eval** | ทดสอบคุณภาพ RAG (~94% accuracy) |

---

## 8. RAG — ระบบค้นหาอัจฉริยะ

### RAG คืออะไร?

**Retrieval-Augmented Generation** — ระบบที่ค้นหาข้อมูลจาก database ก่อน แล้วให้ AI สรุปคำตอบจากข้อมูลจริง (ไม่ใช่เดา)

### ขั้นตอนการทำงาน

```
ผู้ใช้ถาม: "ทุเรียนต้องมีใบอนุญาตอะไรบ้าง?"
    ↓
1. สร้าง embedding จากคำถาม (Gemini → vector 768 มิติ)
    ↓
2. ค้นหาใน pgvector (cosine similarity)
   - cg_document_chunks (กฎระเบียบ)
   - cg_hs_codes (พิกัดศุลกากร)
    ↓
3. ได้ข้อมูลที่เกี่ยวข้อง top-K ชิ้น
    ↓
4. เสริมข้อมูล FTA rates + LPI controls
    ↓
5. ส่งทั้งหมดให้ Gemini 2.5 Flash สรุปคำตอบ
    ↓
6. Return: คำตอบ + แหล่งอ้างอิง (source URLs)
```

### RAG Data ที่มีในระบบ

| ประเภท | จำนวน | ที่มา |
|--------|-------|-------|
| HS Codes | 12,000+ | data.go.th, customs.go.th |
| Document Chunks | 4,678+ | กฎระเบียบ 25 ฉบับ |
| FTA Rates | หลายร้อย | CPTPP, ACFTA, ACIA, JTEPA ฯลฯ |
| LPI Controls | หลายร้อย | ใบอนุญาตนำเข้าตามพิกัด |
| Supplementary | 21,000+ | AD/CVD duty, BOI, Excise, CBP rulings |

### Embedding Model

```
Model:      gemini-embedding-001
Dimensions: 768
Index:      HNSW (cosine similarity)
Storage:    pgvector extension ใน PostgreSQL
Free tier:  Google AI Studio (ไม่เสียเงิน)
```

### คุณภาพ RAG

| Metric | ค่า |
|--------|-----|
| Accuracy (LLM-as-judge) | ~94% |
| เป้าหมาย | >95% |
| Test suite | 50+ คำถามจริง |
| Evaluation method | Gemini Flash ตัดสิน (ถูก/ผิด/บางส่วน) |

### RAG Roadmap

| Phase | สถานะ | รายละเอียด |
|-------|--------|-----------|
| Phase 1: HS Code search | ✅ DONE | Semantic search 12K codes |
| Phase 2: Document RAG | ✅ DONE | กฎระเบียบ 25 ฉบับ, 4,678 chunks |
| Phase 3: Extension integration | 🔨 In Progress | Chat ใน extension ถาม RAG |

---

## 9. ระบบ Multi-Tenancy & Security

### Multi-Tenancy คืออะไร?

ระบบที่ **ลูกค้าหลายรายใช้ระบบเดียวกัน แต่ข้อมูลแยกกันอัตโนมัติ** — ลูกค้า A ไม่เห็นข้อมูลลูกค้า B เลย

### วิธีทำงาน

```
1. ทุก API request ต้องมี header: X-Tenant-ID: <uuid>
   ↓
2. TenantInterceptor ดึง tenant ID → เก็บใน ThreadLocal
   ↓
3. TenantConnectionInterceptor ตั้งค่าใน PostgreSQL:
   SET app.current_tenant_id = '<uuid>'
   ↓
4. PostgreSQL RLS (Row Level Security) กรองข้อมูลอัตโนมัติ:
   ทุก SELECT/INSERT/UPDATE/DELETE → WHERE tenant_id = current_setting('app.current_tenant_id')
   ↓
5. โค้ด Java ไม่ต้องใส่ WHERE tenant_id เอง → RLS ทำให้หมด
```

### Security Layers

| ชั้น | การป้องกัน |
|------|-----------|
| **Cloudflare WAF** | กรองการโจมตีก่อนถึง server |
| **Nginx** | Rate limit (auth: 5 req/min), HSTS, X-Frame-Options DENY |
| **JWT Auth** | ทุก API ต้องมี token (หมดอายุ 24 ชม.) |
| **RLS** | แยกข้อมูลตาม tenant อัตโนมัติใน database |
| **ChatGuard** | Rate limit AI calls (5/min), prompt injection filter, PII masking |
| **Docker** | no-new-privileges, non-root user (UID 1001) |
| **Fail2ban** | SSH brute force protection (3 ครั้ง → แบน 24 ชม.) |
| **chrome.storage.session** | Token หายเมื่อปิด browser |

### Dev vs Production Security

| รายการ | Dev | Production |
|--------|-----|-----------|
| Auth endpoint | `/v1/auth/dev-token` (ใช้ได้) | ปิด (`@Profile("dev")`) |
| CORS | localhost:5173 | vollos.ai domains only |
| Docker ports | bind 127.0.0.1 | internal only |
| SSL | ไม่มี | Cloudflare origin cert |
| Secrets | .env (local) | .env.production (VPS) |

---

## 10. Docker & Infrastructure

### Resource Budget (เครื่อง 2 CPU / 8 GB RAM)

```
Service          CPU     RAM        หน้าที่
─────────────────────────────────────────────────
PostgreSQL       0.5     2.0 GB     Database + pgvector
Backend          0.6     1.5 GB     Spring Boot API
n8n              0.5     2.0 GB     Workflow automation
Redis            0.15    512 MB     Cache + rate limit
Marketing        0.2     256 MB     Next.js website
Nginx            0.1     256 MB     Reverse proxy
MinIO (dev)      0.2     128 MB     S3-compatible storage
─────────────────────────────────────────────────
รวม              ~1.95   ~6.5 GB
OS Reserve       0.05    ~1.5 GB
═════════════════════════════════════════════════
เครื่อง          2.0     8.0 GB
```

> **กฎเหล็ก:** CPU รวมต้อง ≤ 1.9 cores (เหลือ 0.1 ให้ Host OS)

### Docker Compose Files

**`docker-compose.dev.yml` — สำหรับ dev local:**
- PostgreSQL 16 + pgvector (port 5432)
- Redis 7 (port 6379)
- MinIO (port 9000 API, 9001 Console)
- ทุก port bind 127.0.0.1 (ไม่เปิดสู่ภายนอก)

**`docker-compose.yml` — สำหรับ production (VPS):**
- PostgreSQL, Redis, Backend, Marketing, Nginx, n8n
- Health checks ทุก service
- Log rotation (10 MB × 3 files)
- security_opt: no-new-privileges ทุก container
- DB backup อัตโนมัติ (daily 3am)

### VPS Production (Hostinger)

| รายการ | ค่า |
|--------|-----|
| IP | 72.62.248.188 |
| User | ipon (SSH key auth) |
| Files | /opt/vollos/ |
| SSL | Cloudflare origin cert |
| Backup | Daily 3am → /opt/vollos/data/backups/ |
| Monitoring | /actuator/health |

---

## 11. CI/CD — การ Deploy

### Pipeline (GitLab CI)

```
Push to main branch
    ↓
Stage 1: Test
├── test-backend    → Gradle build (Java 21)
└── test-extension  → npm ci + build + test (Node 22)
    ↓
Stage 2: Build
├── build-backend   → Docker image → GitLab Registry
└── build-marketing → Docker image → GitLab Registry
    ↓
Stage 3: Deploy (Manual trigger)
└── deploy-production → SSH to VPS
    ├── docker compose pull
    ├── docker compose up -d
    ├── Health check
    └── Prune unused images
```

### วิธี Deploy ด้วยมือ

```bash
# 1. Push code ไป GitLab
git push origin main

# 2. SSH เข้า VPS
ssh ipon@72.62.248.188

# 3. ไปที่ project
cd /opt/vollos

# 4. Pull code ใหม่
git pull

# 5. Build & start
docker compose -f docker-compose.prod.yml up -d --build

# 6. ตรวจสอบ
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/actuator/health
```

---

## 12. Content Marketing System

### สถาปัตยกรรม

```
Claude Code (AI เขียนบทความ)
    ↓ INSERT
PostgreSQL (mkt_content table)
    ↓ n8n sync
Google Sheets (Review UI — คนตรวจ)
    ↓ Approve
n8n Workflows:
├── Blog Publisher   → marketing-site/blog/
├── Social Publisher → FB, IG, TikTok, X, YouTube
├── Lead Nurture     → SendGrid emails
└── Token Refresh    → auto-refresh OAuth
```

### AI Multi-Agent Writer

| Agent | หน้าที่ |
|-------|--------|
| **Researcher** | ค้นหาข้อมูลศุลกากร, อ้างอิง customs.go.th |
| **Grumpy Expert** | ตรวจความถูกต้องอย่างเข้มงวด (fact-check) |
| **Chief Editor** | เรียบเรียง, ใส่ SEO, ตรวจสำนวน |
| **Gemini Cross-Check** | ตรวจซ้ำด้วย AI อีกตัว (double check) |

### สถานะ

- ✅ DB schema (mkt_content + RLS)
- ✅ Blog pages (Next.js)
- ✅ HS Lookup Tool (citation bait)
- ✅ Schema.org structured data
- ✅ AI Agent prompts (3 agents)
- ✅ n8n workflow templates (5 files)
- ✅ Operations manual
- ⏳ **รอ:** Social media accounts, Google Sheets, SendGrid credentials

---

## 13. n8n Workflows — Automation

### Workflows ที่สร้างไว้แล้ว (รอ credentials)

| Workflow | ไฟล์ | ทำอะไร |
|----------|------|--------|
| Blog Publisher | `blog-publisher.json` | auto-publish บทความจาก DB → website |
| Lead Nurture | `lead-nurture.json` | ส่ง email ต่อเนื่อง (drip campaign) |
| Sheets Review | `sheets-review-sync.json` | sync บทความ ↔ Google Sheets |
| Social Publisher | `social-publisher.json` | โพสต์ลง social media อัตโนมัติ |
| Token Refresh | `token-refresh.json` | auto-refresh OAuth tokens |

### วิธี Import (เมื่อมี credentials)

1. เปิด n8n UI: `http://localhost:5678` (dev) หรือ `https://n8n.vollos.ai` (prod)
2. Settings → Import Workflow → เลือก JSON file
3. ตั้งค่า credentials (Google Sheets, SendGrid, Social API keys)
4. Activate workflow

---

## 14. คำสั่ง Dev ที่ใช้บ่อย

### Backend

```bash
# เริ่ม dev infrastructure (PostgreSQL + Redis + MinIO)
cd /home/ipon/workspace/aiservice
docker compose -f docker-compose.dev.yml up -d

# รัน backend (ต้องตั้ง env vars)
cd backend-core
source ../.env  # load environment variables
./gradlew :platform-app:bootRun

# Build ทั้งหมด
./gradlew build

# ดู logs
docker compose -f docker-compose.dev.yml logs -f postgres
```

### Chrome Extension

```bash
cd chrome-extension/cgai

# Install dependencies
npm install

# Dev mode (watch)
npm run dev

# Production build
npm run build

# โหลดใน Chrome:
# 1. เปิด chrome://extensions/
# 2. เปิด Developer mode
# 3. Load unpacked → เลือก dist/
```

### Marketing Site

```bash
cd marketing-site

# Install
npm install

# Dev mode
npm run dev    # → http://localhost:3000

# Production build
npm run build
```

### Database

```bash
# เข้า PostgreSQL console
docker exec -it saas-db psql -U <username> -d <dbname>

# ดู tables ทั้งหมด
\dt

# ดู HS codes
SELECT code, description_th FROM cg_hs_codes LIMIT 10;

# ดู scan jobs
SELECT id, status, created_at FROM ai_jobs ORDER BY created_at DESC LIMIT 10;
```

### Claude Code Skills (ใช้ใน Claude Code)

```
/check-table <name>     → ดู schema ของ table
/db-health              → ตรวจสุขภาพ DB + API
/vollos-api-test <url>  → ทดสอบ API endpoint
/review-db <file>       → ตรวจ SQL migration
/review-java <file>     → ตรวจ Java code
/security-audit <scope> → ตรวจ security
/review-infra <file>    → ตรวจ Docker config
```

---

## 15. Checklist ก่อนให้ลูกค้าทดลอง

### Phase A: Technical (1-2 วัน)

- [x] แก้ 12 false claims บนเว็บ marketing
- [x] สร้าง OG Image
- [ ] Screenshot Extension จริง (4 ภาพ)
- [ ] ทดสอบ full flow end-to-end:
  - [ ] Login Google OAuth (production)
  - [ ] Upload PDF → ได้ HS Code ถูกต้อง
  - [ ] FTA alert แสดงถูกต้อง
  - [ ] LPI alert แสดงถูกต้อง
  - [ ] Magic Fill ใส่ค่าลงฟอร์มได้

### Phase B: เตรียมตัว (1 วัน)

- [ ] เตรียม PDF Invoice ตัวอย่าง 2-3 ใบ (สินค้าจริง)
- [ ] เขียนคู่มือผู้ใช้ 1 หน้า (วิธีใช้ extension)
- [ ] สร้างช่องทางรับ feedback (LINE OA / Google Form)
- [ ] หา beta tester 3-5 คน

### Phase C: User Testing (1-2 สัปดาห์)

- [ ] สังเกตผู้ใช้ (ไม่สอน ดูเขาใช้เอง)
- [ ] บันทึก pain points
- [ ] ถามคำถามสำคัญ:
  - ปัจจุบันกรอกใบขนยังไง? ใช้เวลาเท่าไร?
  - ถ้ามีเครื่องมือนี้จะประหยัดเวลาได้เท่าไร?
  - ยินดีจ่ายเดือนละเท่าไร?
- [ ] ตัดสินใจ: Go / Pivot / Stop

### หา Beta Tester ได้จากไหน?

1. เพื่อน/คนรู้จักในวงการนำเข้า-ส่งออก
2. Facebook Groups: ชิปปิ้ง, นำเข้า-ส่งออก, customs broker
3. สมาคมชิปปิ้งแห่งประเทศไทย
4. LinkedIn: customs broker, freight forwarder, logistics
5. หอการค้า

---

## 16. Roadmap & สิ่งที่ต้องทำต่อ

### ลำดับความสำคัญ (Priority Order)

#### 🔴 ต้องทำก่อน Beta Launch

| # | งาน | หมายเหตุ |
|---|-----|---------|
| 1 | ทดสอบ Google OAuth บน production | ต้องลอง login จริง |
| 2 | Screenshot Extension จริง (แทนภาพ placeholder) | สำหรับเว็บ marketing |
| 3 | ทดสอบ full flow E2E บน production | upload PDF → ได้ผลลัพธ์ถูก |
| 4 | เตรียม PDF ตัวอย่าง + คู่มือ 1 หน้า | สำหรับ beta tester |

#### 🟡 ทำหลัง Beta Launch

| # | งาน | หมายเหตุ |
|---|-----|---------|
| 5 | ~~Usage Quota System~~ | ✅ เสร็จแล้ว (2026-03-09) |
| 6 | ~~Admin Upgrade + Plan CRUD API~~ | ✅ เสร็จแล้ว (2026-03-09) |
| 7 | ~~Pricing Page~~ | ✅ เสร็จแล้ว (2026-03-09) |
| 8 | AI Audit Traffic Light (#6) | ระบบไฟจราจรแจ้งเตือนความเสี่ยง |
| 9 | Fix MFN duty rate regression | RAG eval ตกจาก 94% → ต้องแก้ |
| 10 | Opn Payments (Omise) | ระบบชำระเงินอัตโนมัติ (รอเจ้าของสมัคร) |

#### 🟢 ทำภายหลัง (Nice to Have)

| # | งาน | หมายเหตุ |
|---|-----|---------|
| 10 | Social Media Accounts + n8n Workflows | รอ credentials |
| 11 | Line-Item Consolidator (#3) | รวมรายการซ้ำ |
| 12 | Auto-Freight Proration (#4) | คำนวณ CIF |
| 13 | Post-Audit Ghost (#7) | จำลองการตรวจสอบ |
| 14 | Duty Drawback Tracer (#11) | เคลมคืนภาษี |
| 15 | HS-Code Defense Generator (#12) | สร้างเหตุผลทางกฎหมาย |
| 16 | Supplier Integrity Checker (#13) | ตรวจผู้ขายผิดปกติ |

### Credentials ที่ยังรอ

| รายการ | ต้องทำอะไร | ใช้กับ |
|--------|-----------|--------|
| Social Media Accounts | สร้าง TikTok, FB page, IG, X | Content Marketing |
| Google Sheets | สร้าง spreadsheet + share | บทความ review |
| SendGrid | สมัคร + ได้ API key | Email nurture |
| n8n Credentials | ตั้งค่าหลัง import workflow | Automation ทั้งหมด |
| Opn Payments (Omise) | สมัคร https://www.opn.ooo → ยืนยันตัวตน | ระบบชำระเงินอัตโนมัติ |

---

## Appendix: กฎเหล็กที่ต้องจำ

### Architecture Commandments

1. **Silence is Veto** — ไม่แน่ใจ → ถามก่อน ห้ามเดา
2. **No Yes-Man** — ถ้าสิ่งที่สั่งเสี่ยงต่อเครื่อง 8 GB / security → ต้อง "ขัด"
3. **Sequential Write Rule** — ห้ามใช้ `GenerationType.AUTO` → ต้อง UUID v7
4. **Audit-Ready** — ทุกการลบ/แก้ต้อง log, ทุก query ผ่าน RLS
5. **The 1.9 Rule** — Docker CPU รวม ≤ 1.9 cores
6. **Binary-Free** — ห้ามเก็บ binary ใน container → ใช้ S3/MinIO
7. **Shadow Build** — ห้ามสร้าง GraalVM native image บน production

### Emergency Stops

```bash
# หยุด dev infrastructure
docker compose -f docker-compose.dev.yml down

# หยุด backend
pkill -f gradlew  # หรือ
pkill -f java

# หยุด MCP
pkill -f mcp
pkill -f dbhub

# ล้าง cached token
rm -f /tmp/vollos-dev-token
```

---

> **เอกสารนี้สร้างโดย Claude Code** — อัปเดตล่าสุด 2026-03-09 (เพิ่ม Admin Plan CRUD API + Usage Quota)
> ถ้าต้องการอัปเดต ให้บอก Claude Code: "อัปเดตคู่มือโปรเจกต์"
