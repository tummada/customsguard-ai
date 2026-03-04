# 🔍 VOLLOS AI-SaaS — Project Scan Report
> สแกนโดย Antigravity | วันที่: 2026-03-02

---

## 🏠 โปรเจ็คนี้คืออะไร? (อธิบายแบบเด็ก 10 ขวบ)

สมมติว่าคุณเปิด **"ห้างสรรพสินค้า AI"** ชื่อว่า **VOLLOS**

- คุณเป็น **"เจ้าของห้าง"** — คิดไอเดียธุรกิจเอง สร้างร้านเอง
- ทุกร้านใช้ระบบกลาง (ประตู กล้อง ตู้เซฟ) เดียวกัน ประหยัดสุดๆ
- ลูกค้าสมัครสมาชิกห้าง แล้วเลือกว่าจะเข้าร้านไหน
- **ข้อมูลลูกค้าแต่ละรายแยกกันเด็ดขาด** — ดูข้อมูลกันไม่ได้เลย

### ร้านที่มีอยู่แล้ว:
| ร้าน | ทำอะไร |
|---|---|
| 🛡️ **CustomsGuard AI** | ช่วยจำแนก HS Code จากใบขนสินค้า ด้วย AI |
| 🦷 **Dental Recall** *(วางแผนอยู่)* | ระบบดึงคนไข้เดิมกลับมาคลินิกหมอฟัน |

### เงินทุกร้านเข้าที่ไหน?
> กระเป๋าเดียวกัน — คุณ (เจ้าของ) รับครบ เพราะเป็นเจ้าของทุกร้าน

---

## 🏗️ แผนผังระบบ (ภาพรวม)

```
🌐 ลูกค้าเปิดเว็บ
      │
      ▼
🚪 ยาม: Nginx (CPU 0.1, RAM 256MB)
      │
      ├──▶ 🏪 Marketing Site (Next.js)   ← หน้าโฆษณา, รับ Lead
      ├──▶ 📺 Frontend App (Angular 21)  ← แอปหลักที่ลูกค้าใช้งาน  
      ├──▶ 🖥️ Backend API (Java 21)      ← สมองของทั้งระบบ
      └──▶ 🤖 n8n                        ← สั่งงาน AI

🗄️ PostgreSQL 16 + pgvector   ← ตู้เซฟข้อมูลทั้งหมด
📮 Redis (AOF)                 ← คิวงาน + Cache
☁️ S3/Cloudflare R2           ← ที่เก็บไฟล์ (ไม่เก็บในเครื่อง)
🎮 RunPod GPU (External)      ← เครื่องประมวลผล AI ข้างนอก
```

---

## 🔧 Tech Stack ที่ใช้

| ส่วนงาน | เทคโนโลยี | เหตุผล |
|---|---|---|
| **Backend** | Spring Boot 3.5 + Java 21 | Ecosystem แน่น, Virtual Threads |
| **Native Build** | GraalVM Native Image | ประหยัด RAM มหาศาล |
| **Database** | PostgreSQL 16 + pgvector | RLS, UUID v7, Vector Search (RAG) |
| **Cache/Queue** | Redis 7 (AOF) | เร็ว, ทนทาน |
| **AI Workflow** | n8n (Queue Mode) | Visual Pipeline, ไม่ต้องเขียนโค้ดหนัก |
| **Frontend** | Angular 21 (Zoneless+Signals) | เร็ว, ประหยัด RAM |
| **Marketing** | Next.js 15 + TypeScript | SSR, SEO ดี |
| **Chrome Ext** | Vite + TS | CGAI Extension |
| **Infra** | Docker Compose | จัดการง่าย, Local = Production |

---

## 📊 Resource Budget (งบ 2 CPU / 8 GB RAM)

| Service | CPU Limit | RAM Limit | สถานะใน docker-compose.yml |
|---|---|---|---|
| PostgreSQL | 0.5 | 2,048 MB | ✅ กำหนดแล้ว |
| Redis | 0.2 | 512 MB | ✅ กำหนดแล้ว |
| Backend | 0.8 | 1,536 MB | ✅ กำหนดแล้ว |
| n8n Main | 0.1 | 512 MB | ✅ กำหนดแล้ว |
| n8n Worker | 0.3 | 1,536 MB | ✅ กำหนดแล้ว |
| Marketing | 0.2 | 256 MB | ✅ กำหนดแล้ว |
| Nginx | 0.1 | 256 MB | ✅ กำหนดแล้ว |
| **รวม** | **2.2 CPU** | **~6,656 MB** | ⚠️ เกิน CPU Limit! |

> **System Reserve:** ≈ 1,344 MB RAM (เพียงพอ) แต่ CPU เกินกฎเหล็ก

---

## ✅ สิ่งที่ทำได้ดีมาก

### 1. Security Architecture — ระดับ World-Class
- **Row-Level Security (RLS)** ทุก table + `FORCE ROW LEVEL SECURITY` ป้องกันแม้ developer ลืมเขียน WHERE
- **3-Layer Protection:** `@RequiresFeature` → RLS → Classpath Guard
- **Idempotency** ทุก API การเงิน ป้องกันหักเครดิตซ้ำ
- **JWT** Access Token 15 นาที + Refresh Token 7 วัน

### 2. Database Design — Append-Only Ledger
- `credit_ledger` เป็น append-only (TOPUP, RESERVE, CONFIRM, REFUND) — ตรวจสอบย้อนหลังได้ 100%
- DB Trigger `trg_init_balance` และ `trg_sync_balance` — ป้องกัน race condition ในระดับ DB
- UUID v7 ทุกที่ — เรียงตามเวลา เขียน B-Tree index เร็วกว่า UUID v4

### 3. Transactional Outbox Pattern
- บันทึก `ai_jobs` + `outbox_events` ใน **Transaction เดียวกัน** — ไม่มีงานหาย แม้ n8n ล่ม
- Index `idx_outbox_unprocessed` กรอง `WHERE processed_at IS NULL` ไว้โดยเฉพาะ

### 4. Infrastructure Config
- Logging `json-file` + max-size 10m, max-file 3 — **ทุก service**  
- Health Check ครบทุก service สำคัญ
- Redis `requirepass` + `appendonly yes` (AOF durability)
- Nginx `server_tokens off`, Security headers ครบ
- SSE endpoint ตั้งค่า `proxy_buffering off` ถูกต้อง

### 5. Modular Architecture
- **Pluggable Feature System** — เพิ่ม feature ใหม่ได้โดยไม่แก้ core
- Flyway migration แยก namespace `V1000+` สำหรับ feature-customsguard
- `SpringAutoConfiguration` — feature เสียบเข้า-ถอดออกได้จาก classpath

### 6. RAG Infrastructure พร้อมแล้ว
- PostgreSQL ใช้ image `pgvector/pgvector:pg16` — Vector Database พร้อมใช้
- `model_type` และ `output_urls JSONB` ใน `ai_jobs` รองรับหลาย AI model
- n8n Queue Mode — ออกแบบสำหรับ async RAG pipeline

---

## ⚠️ สิ่งที่ต้องแก้ไข / จุดเสี่ยง

### 🔴 Critical

#### 1. CPU Budget เกิน "The 1.9 Rule"
```
กฎ: ยอดรวม CPU ≤ 1.9 แกน
ปัจจุบัน: 0.5 + 0.2 + 0.8 + 0.1 + 0.3 + 0.2 + 0.1 = 2.2 แกน ❌
```
**แนะนำ:**
- Backend: 0.8 → 0.6 (ใช้ Virtual Threads ได้ดีอยู่แล้ว)
- PostgreSQL: 0.5 → 0.4 (ตาม skill matrix)
- ยอดรวมใหม่: 0.4+0.2+0.6+0.1+0.3+0.2+0.1 = **1.9 ✅**

#### 2. n8n Main ไม่มี `restart: unless-stopped` และ `depends_on`
ใน `docker-compose.yml` บรรทัดที่ 81-99 — n8n main service ขาด:
- `restart: always` หรือ `unless-stopped`
- `depends_on` Redis + Postgres
- `oom_score_adj` (ควรใส่ 500 ตาม skill matrix)

#### 3. n8n ไม่มี `N8N_ENCRYPTION_KEY`
n8n เก็บ credentials ใน DB ด้วย encryption key — ถ้าไม่ตั้ง จะ random ทุกครั้งที่ restart ทำให้ credentials ทุกอันใช้งานไม่ได้

### 🟡 Warning

#### 4. Marketing Site ต่อ PostgreSQL โดยตรง — ผิด Pattern
```yaml
# docker-compose.yml บรรทัด 129
DB_URL: postgres://postgres:5432/${DB_NAME}  ← ⚠️
```
Marketing site ควรส่งข้อมูล lead **ผ่าน Backend API** (`POST /v1/marketing/leads`) ไม่ใช่เชื่อมตรงกับ DB เพราะ:
- ทำลาย connection pool budget ของ PostgreSQL
- Marketing site เป็น Next.js ขาด RLS context ที่ถูกต้อง

#### 5. V2 และ V3 Migration ซ้ำซ้อน
มีทั้ง `mkt_leads` (V2) และ `marketing_leads` (V3) — table เดียวกัน 2 ชื่อ ควรลบ V2 ออกหรือ drop table เก่า

#### 6. Frontend App ยังว่างเปล่า
`frontend-app/` มีแค่ `Dockerfile` — Angular 21 ยังไม่ได้สร้าง ถ้าเปิด Nginx ตอนนี้จะ 404 หมด

#### 7. RAG: pgvector Table ยังไม่มี Migration
pgvector พร้อมแล้วในระดับ PostgreSQL extension แต่ยังไม่มี:
- Table สำหรับ vector embeddings (เช่น `cg_document_chunks`)
- Column `embedding vector(1536)` หรือ `vector(768)`
- Index `HNSW` หรือ `IVFFlat` สำหรับ similarity search

### 🟢 Minor

#### 8. Redis ไม่ได้ตั้ง `maxmemory` และ `maxmemory-policy`
ตาม skill matrix ควรเป็น `allkeys-lru` เพื่อ evict เมื่อ RAM เต็ม แต่ตอนนี้ command แค่ `requirepass + appendonly`

#### 9. Swap ยังไม่ได้ตั้งค่า (ถ้า local = production)
ตาม skill: `vm.swappiness=10` + Swap 4-8GB ยังไม่มีใน repo (ควรอยู่ใน `infra/scripts/setup-host.sh`)

#### 10. Cron Pruning ยังไม่มี
`docker system prune` ทุกอาทิตย์ควรอยู่ใน crontab host แต่ยังไม่เห็น script ใน repo

---

## 🤖 RAG (Retrieval-Augmented Generation) — ไปได้สวยแค่ไหน?

### สถานะตอนนี้
```
Infrastructure: ✅ pgvector พร้อม
AI Pipeline:    ✅ n8n Queue Mode พร้อม
S3 Storage:     ✅ พร้อมเก็บ Document
RAG Table:      ❌ ยังไม่มี migration
Embedding API:  ⚠️ มี GEMINI_API_KEY → ใช้ text-embedding-004 ได้
RAG Endpoint:   ❌ ยังไม่มี /v1/customsguard/analyze ที่ทำ RAG จริง
```

### ภาพ RAG Pipeline ที่ควรเป็น (สำหรับ CustomsGuard)

```
📄 ลูกค้าอัพโหลด PDF ใบขน (≤10MB ตาม Nginx limit)
      ↓
🖥️ Backend: บันทึกใน S3 → สร้าง ai_job → เขียน outbox_event
      ↓
🤖 n8n Worker:
  1. ดึงไฟล์จาก S3 (Presigned URL)
  2. แยกข้อความจาก PDF
  3. แบ่งเป็น Chunks (512 tokens)
  4. เรียก Gemini text-embedding-004
  5. บันทึก vector ลง cg_document_chunks (pgvector)
      ↓
🔍 Similarity Search: "HS Code คืออะไรสำหรับสินค้านี้?"
  → top-k chunks จาก pgvector
      ↓
🧠 LLM (Gemini Pro): Chunks + Prompt → ตอบคำถาม / จำแนก HS Code
      ↓
✅ Backend อัพเดท ai_job + SSE แจ้ง Angular
```

### Migration ที่ต้องสร้าง (ตัวอย่าง)

```sql
-- V1001__customsguard_rag.sql
CREATE TABLE cg_document_chunks (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    declaration_id UUID REFERENCES cg_declarations(id),
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),  -- Gemini text-embedding-004 = 768 dimensions
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON cg_document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- RLS
ALTER TABLE cg_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_document_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cg_document_chunks
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 💻 จำลอง Production บน Local — ทำได้แค่ไหน?

### ปัญหา: Local vs Production
| หัวข้อ | เครื่อง Local | Production (Target) |
|---|---|---|
| RAM | ไม่จำกัด (อาจมี 32GB) | 8GB Hard Limit |
| CPU | หลาย Core | 2 Core |
| Swap | ไม่มี | 4-8GB |
| OOM Score | ไม่มี | กำหนดใน compose |

### วิธีจำลอง Production บน Local (Docker Resource Limiting)

Docker Compose ตอนนี้ใช้ `deploy.resources.limits` ซึ่ง **ทำงานเฉพาะใน Docker Swarm** ไม่ใช่ `docker compose up` ธรรมดา!

```bash
# ตรวจสอบว่า limit ทำงานจริงมั้ย
docker stats  # ถ้า limit ไม่ทำงาน จะเห็น Memory Usage ไม่ถูกจำกัด
```

**วิธีแก้: ใช้ `--compatibility` flag หรือย้ายไป `mem_limit`**

```yaml
# แบบ docker compose ธรรมดา (ไม่ใช้ swarm)
services:
  backend:
    mem_limit: 1536m
    cpus: '0.6'
    # หรือ
    deploy:
      resources:
        limits:
          memory: 1536M
          cpus: '0.6'
```

**สั่งรัน:**
```bash
# วิธีที่ 1: compatibility mode (รองรับ deploy.resources บน compose ธรรมดา)
docker compose --compatibility up -d

# วิธีที่ 2: ดู stats แบบ real-time
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

### สร้าง Swap สำหรับ Local Testing
```bash
# สร้าง Swap 4GB เพื่อจำลอง Production
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo sysctl vm.swappiness=10
```

---

## 📋 Checklist สรุป: ไปได้สวยแค่ไหน?

| หมวด | คะแนน | หมายเหตุ |
|---|---|---|
| **Security & Multi-tenancy** | 🟢 9/10 | RLS, JWT, Idempotency ดีมาก |
| **Database Design** | 🟢 8/10 | Ledger, Triggers, UUID v7 ดีมาก |
| **Infrastructure Config** | 🟡 6/10 | CPU เกิน 1.9, n8n ขาด restart |
| **RAG Pipeline** | 🟡 4/10 | Infrastructure พร้อม แต่ยังไม่มี Table/Endpoint |
| **Frontend** | 🔴 2/10 | Angular ยังไม่มีโค้ดเลย |
| **Local = Production** | 🟡 5/10 | `deploy.resources` ใช้ไม่ได้บน compose ธรรมดา |
| **Ops (Swap/Cron/Backup)** | 🔴 3/10 | ยังไม่มี script ใน repo |

### คะแนนรวม: 6/10 — **ไปได้ดี แต่ยังมีงานสำคัญที่รอ**

---

## 🚀 สิ่งที่ควรทำ Next (เรียงตาม Priority)

1. **[Critical]** แก้ CPU budget: Backend 0.8→0.6, PostgreSQL 0.5→0.4 ให้รวม ≤1.9
2. **[Critical]** เพิ่ม `restart: always`, `depends_on`, `N8N_ENCRYPTION_KEY` ให้ n8n main
3. **[High]** เปลี่ยน Marketing Site ให้ส่ง leads ผ่าน Backend API แทน direct DB
4. **[High]** สร้าง `V1001__customsguard_rag.sql` — pgvector table + HNSW index
5. **[High]** เริ่ม Angular frontend-app (ตอนนี้ว่างเปล่า)
6. **[Medium]** เพิ่ม `maxmemory` + `maxmemory-policy allkeys-lru` ใน Redis
7. **[Medium]** สร้าง `infra/scripts/setup-host.sh` สำหรับ Swap + sysctl
8. **[Medium]** รันด้วย `docker compose --compatibility` เพื่อ enforce resource limits บน local
9. **[Low]** ลบ V2 migration `mkt_leads` ที่ซ้ำกับ V3 `marketing_leads`
10. **[Low]** สร้าง `infra/scripts/weekly-prune.sh` + crontab สำหรับ docker system prune

---

> สแกนโดย Antigravity AI | `/home/ipon/workspace/aiservice` | 2026-03-02
