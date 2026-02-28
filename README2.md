# AI-SaaS World-Class — Project Overview

> เป้าหมาย: แพลตฟอร์ม SaaS สำหรับ AI Generation บน single server ขนาด 8GB RAM / 1.9 CPU

---

## ภาพรวม 2 ระบบหลัก

โปรเจ็คนี้แบ่งออกเป็น 2 ระบบหลักที่ทำงานแยกจากกันโดยเจตนา:

```
aiservice/
├── marketing-site/      ← ระบบที่ 1: Next.js landing page (ACTIVE)
├── frontend-app/        ← ระบบที่ 2 (Core): Angular 21 — scaffolded
├── backend-core/        ← ระบบที่ 2 (Core): Spring Boot 3.5 — scaffolded
├── infra/               ← Nginx reverse proxy
├── docs/                ← OpenAPI 3.0.3 spec
├── docker-compose.yml   ← Full stack orchestration
└── V*.sql               ← Database migrations (Flyway)
```

---

## ระบบที่ 1: Marketing Site

**ทำไมต้องแยก?**
Marketing site ถูกแยกออกจาก Core App โดยเจตนาเพื่อ:
- ความเร็ว — ไม่ถูกกระทบจากการพัฒนา Core
- ความยืดหยุ่น — deploy แยก, cache แยก, scale แยก
- SEO — Next.js SSR/SSG เหมาะสมกว่า Angular สำหรับ landing page

**Tech Stack**

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| UI Library | React | 19.2.3 |
| Animation | Framer Motion | 12.34.3 |
| Scroll | Lenis | 1.3.17 |
| Validation | Zod | 4.3.6 |
| Styling | Tailwind CSS | 4 |
| Database client | pg (PostgreSQL) | 8.18.0 |
| Language | TypeScript | 5 |

**โครงสร้างไฟล์**

```
marketing-site/src/
├── app/
│   ├── page.tsx          # Landing page หลัก (Hero → Features → CTA → Footer)
│   ├── layout.tsx        # Root layout, fonts, metadata
│   ├── globals.css       # Global styles
│   └── actions.ts        # Server Action: บันทึก lead ลง PostgreSQL
├── components/
│   ├── LeadForm.tsx      # Founder's Club signup form (465 บรรทัด)
│   ├── BentoCard.tsx     # Feature card แบบ bento grid
│   ├── RadarBlueprint.tsx # Mouse-tracking gold glow effect
│   ├── TimeCollapse.tsx  # Animation timeline
│   ├── GrainNoise.tsx    # Grain texture overlay
│   ├── SmoothScroll.tsx  # Lenis smooth scroll wrapper
│   └── Icons.tsx         # SVG icon library
└── lib/
    ├── db.ts             # PostgreSQL connection pool + RLS enforcement
    └── uuid.ts           # UUID v7 generator
```

**ฟีเจอร์หลักของ Landing Page**
- Theme สีทอง (#D4AF37) — Luxury AI brand
- Hero Section — pitch หลักของ product
- Process Steps — Upload → AI Analysis → Auto-fill
- Bento Grid — feature showcase
- "Founder's Club" CTA — Beta access + 50% lifetime discount
- Security badges — AES-256, ISO-27001, PDPA

**LeadForm** (`LeadForm.tsx`)
- ฟิลด์: ชื่อ, บริษัท, อีเมล (รองรับ domain ไทย), โทรศัพท์ (10 หลัก), หมวดหมู่
- Honeypot spam protection
- Real-time validation พร้อม error messages
- Animated states ผ่าน Framer Motion
- ส่งข้อมูลผ่าน Server Action ไปเก็บใน `marketing_leads` table

**Resource Limits (Production)**
- RAM: 256MB
- CPU: 0.2 cores

---

## ระบบที่ 2: Core App

**เป้าหมาย**: แพลตฟอร์ม SaaS หลัก — จัดการ Authentication, Credits, AI Jobs, Billing
ในอนาคตจะมี mini-apps ต่างๆ อยู่ภายใต้ Core นี้

### Backend (Java Spring Boot)

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | Java | 21 |
| Framework | Spring Boot | 3.5 |
| Build | Gradle | - |
| Runtime | GraalVM Native Image | 21 |
| Memory limit | -Xmx512m | 1024MB container |

> **สถานะ**: Scaffolded (Dockerfile พร้อม, source code ยังไม่ได้เขียน)

**GraalVM Native Image** ถูกเลือกเพื่อ:
- Cold start < 50ms (vs JVM ~3-5s)
- Final image ~50MB (vs JVM ~400MB+)
- ใช้ RAM น้อยลงอย่างมีนัยสำคัญ

### Frontend App (Angular)

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (Zoneless) |
| Architecture | Signals-based (no Zone.js) |
| Build output | Static files served via Nginx |
| Memory limit | 256MB |

> **สถานะ**: Scaffolded (Dockerfile พร้อม, source code ยังไม่ได้เขียน)

---

## Database (PostgreSQL 16)

**Multi-tenant isolation ผ่าน Row-Level Security (RLS)**

```sql
-- ทุก query ต้องเซ็ต tenant context ก่อนเสมอ
SET LOCAL app.current_tenant_id = '<uuid>';
```

**Schema หลัก**

```
tenants              ← รายชื่อ tenant ทั้งหมด
tenant_balances      ← ยอด credit แต่ละ tenant (aggregate)
credit_ledger        ← ทุก transaction credit (TOPUP/RESERVE/CONFIRM/REFUND)
ai_jobs              ← งาน AI ทั้งหมด (status: CREATED→QUEUED→PROCESSING→COMPLETED)
outbox_events        ← Transactional outbox (Stripe webhooks, Email notifications)
marketing_leads      ← Lead จาก marketing site
```

**Trigger อัตโนมัติ**
- `init_tenant_balance()` — สร้าง balance row ทันทีที่ tenant ถูกสร้าง
- `sync_tenant_balance()` — อัปเดต balance aggregate เมื่อ ledger มีรายการใหม่

---

## AI Workflow (n8n Queue Mode)

ใช้ n8n เป็น AI Orchestration layer เชื่อมกับ ComfyUI / GPU worker

```
Client → Backend API → Redis Queue → n8n Worker → GPU API → S3 Storage
                    ↕
               PostgreSQL (job status)
```

- **n8n Main**: รับ webhook, route งาน, manage workflow
- **n8n Worker**: process AI jobs จาก Redis queue
- **Redis**: Message broker + Job queue + Session cache

---

## Infrastructure

**Docker Compose Services**

| Service | Image | RAM | CPU |
|---------|-------|-----|-----|
| postgres | postgres:16-alpine | 1536MB | 0.4 |
| redis | redis:7-alpine | 512MB | 0.2 |
| backend | GraalVM Native | 1024MB | 0.6 |
| n8n-main | n8nio/n8n:latest | 512MB | 0.1 |
| n8n-worker | n8nio/n8n:latest | 1536MB | 0.3 |
| marketing-site | Node.js/Next.js | 256MB | 0.2 |
| nginx | nginx:alpine | 256MB | 0.1 |
| **Total** | | **~5.6GB** | **~2.0** |

**Nginx Routing**

```
/              → Angular static files (cache 7 days)
/v1/*          → Spring Boot backend (30s timeout)
/v1/jobs/stream → SSE stream (no buffer, 3600s timeout)
/n8n/*         → n8n UI (WebSocket, 86400s timeout)
```

---

## REST API (OpenAPI 3.0.3)

**Authentication**: Bearer JWT + `X-Tenant-ID` header

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/jobs` | List AI jobs (paginated) |
| POST | `/v1/jobs` | Create new AI job |
| GET | `/v1/jobs/{id}` | Poll job status |
| GET | `/v1/jobs/stream` | SSE real-time updates |
| GET | `/v1/billing/balance` | Check credits |
| POST | `/webhooks/stripe` | Payment webhook |

**Job Status Flow**
```
CREATED → QUEUED → PROCESSING → COMPLETED
                             ↘ FAILED
                             ↘ STALLED
```

---

## Environment Variables (สำคัญ)

```bash
# Database
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# JWT
JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRATION_MS=900000 (15 min)

# Stripe
STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET

# S3 / Cloudflare R2
S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_ENDPOINT

# SMTP
SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

# n8n
N8N_ENCRYPTION_KEY, AI_ENGINE_API_URL, AI_ENGINE_API_KEY
```

ดู `.env.example` สำหรับ template ครบถ้วน

---

## Development Roadmap

**ทำเสร็จแล้ว (Marketing Site)**
- [x] Landing page ครบถ้วน (Hero, Features, CTA, Footer)
- [x] LeadForm พร้อม validation และ animation
- [x] Server Action บันทึก lead ลง PostgreSQL
- [x] Database schema (RLS, marketing_leads)
- [x] Docker Compose full stack configuration
- [x] Nginx reverse proxy configuration
- [x] OpenAPI 3.0.3 specification

**ถัดไป (Core App)**
- [ ] Spring Boot backend source code
  - Authentication (JWT, refresh token)
  - Credit ledger API
  - AI Jobs API + SSE streaming
  - Stripe webhook handler
  - Transactional outbox processor
- [ ] Angular 21 frontend source code
  - Login / Register pages
  - Dashboard
  - AI Job submission UI
  - Real-time progress via SSE
- [ ] n8n workflow configuration
- [ ] GPU worker integration (ComfyUI)

---

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env
# แก้ไขค่าใน .env ให้เหมาะสม

# 2. Start all services
docker compose up -d

# 3. Marketing site จะพร้อมที่
# http://localhost (via Nginx)
# หรือ dev mode:
cd marketing-site && npm run dev  # http://localhost:3000
```

---

## Project Philosophy

> "Efficiency is the highest form of Beauty"

- **Async-First**: งานหนักทั้งหมดรันใน n8n queue (ไม่ block HTTP)
- **RAM Awareness**: ทุก service มี memory limit ชัดเจน รวมกันไม่เกิน 8GB
- **Tenant Isolation**: RLS enforce ที่ database level ทุก query
- **Idempotency**: ทุก mutation มี idempotency key ป้องกัน double-process
- **Outbox Pattern**: ป้องกัน Stripe/Email event lost เมื่อ service down

---

*อัปเดตล่าสุด: 2026-02-28*
