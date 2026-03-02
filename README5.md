# CustomsGuard AI — RAG Development Plan

## 1. สถานะปัจจุบัน (Current State)

### Backend Stack
| Component | Technology | Resource |
|-----------|-----------|----------|
| API Server | Spring Boot 3.5 + GraalVM Native Image | 0.6 CPU / 1.0 GB |
| Database | PostgreSQL 16 (RLS multi-tenant) | 0.4 CPU / 1.5 GB |
| Cache/Queue | Redis 7 (AOF, n8n queue) | 0.2 CPU / 512 MB |
| Orchestrator | n8n (main + worker) | 0.5 CPU / 2.0 GB |
| Proxy | Nginx Alpine | 0.1 CPU / 256 MB |
| Marketing | Next.js | 0.2 CPU / 256 MB |
| **Total** | | **1.9 CPU / ~5.5 GB** |
| **System Reserve** | OS + Swap | **0.1 CPU / ~2.5 GB** |

### CustomsGuard Feature (ปัจจุบัน)
- `cg_hs_codes` — ตาราง HS Code (code, description, duty_rate)
- `cg_declarations` — ใบขนสินค้า (items เป็น JSONB)
- API: `GET /v1/customsguard/hs-codes?query=...` — **LIKE-based text search เท่านั้น**
- Chrome Extension: ใช้ Gemini API ตรง → AI เดา HS Code ไม่มีฐานอ้างอิง → confidence ต่ำ

### ปัญหาที่ต้องแก้
- AI ไม่มีฐานความรู้ HS Code จริง → confidence ต่ำ (สีส้ม/แดง)
- ไม่มี semantic search → ค้นหาด้วย LIKE ไม่เข้าใจ context
- ไม่มีข้อมูลกฎระเบียบ คดีความ อัตราอากร

---

## 2. Resource Conflict Analysis (ปะทะ infrastructure-devops.md)

### กฎที่ต้องระวัง:

| กฎ | ข้อจำกัด | ผลต่อ RAG |
|----|---------|-----------|
| **The 1.9 Rule** | CPU รวมต้องไม่เกิน 1.9 (ใช้ไปแล้ว 1.9) | ห้ามเพิ่ม service/container ใหม่ |
| **RAM 8GB** | เหลือ ~2.5 GB (system reserve) | ห้ามรัน embedding model local (ต้องการ 2-4 GB) |
| **Binary-Free Rule** | ห้ามเก็บไฟล์ใน container | เอกสาร PDF/CSV ต้องเก็บ S3 เท่านั้น |
| **Stateless Logic** | Disk IOPS สงวนให้ Database | ห้ามทำ file-based indexing |
| **Shadow Build** | ห้าม build heavy process บน production | ห้ามสร้าง embedding index บน production |

### สรุป: สิ่งที่ทำได้ vs ทำไม่ได้

**ทำได้:**
- เพิ่ม `pgvector` extension ใน PostgreSQL เดิม (ไม่กิน resource เพิ่ม)
- เรียก External Embedding API (Gemini/OpenAI) จาก n8n worker
- เก็บ vector ใน PostgreSQL column (ใช้ RAM เดิมของ PostgreSQL)
- เพิ่ม API endpoint ใน Backend เดิม

**ทำไม่ได้:**
- รัน embedding model local (sentence-transformers, ollama) — RAM ไม่พอ
- เพิ่ม container ใหม่ (Qdrant, Weaviate, Milvus) — CPU เกิน 1.9
- เก็บไฟล์เอกสารใน container filesystem
- สร้าง HNSW index ขนาดใหญ่บน production (ต้อง batch offline)

---

## 3. RAG Architecture (ออกแบบให้อยู่ใน resource)

```
┌─────────────────────────────────────────────────────────┐
│                    Data Ingestion Pipeline               │
│                                                         │
│  เอกสาร (PDF/CSV)                                       │
│       ↓                                                 │
│  S3 Upload (presigned URL)                              │
│       ↓                                                 │
│  n8n Worker ── chunk text ── call Gemini Embedding API  │
│       ↓                              ↓                  │
│  PostgreSQL + pgvector          768-dim vector           │
│  (cg_hs_codes.embedding)                                │
│  (cg_document_chunks.embedding)                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Query Pipeline                        │
│                                                         │
│  Chrome Ext: scan PDF → สกัดคำอธิบายสินค้า              │
│       ↓                                                 │
│  Backend API: POST /v1/customsguard/hs-codes/semantic   │
│       ↓                                                 │
│  1. Embed query text (Gemini API)                       │
│  2. pgvector: cosine similarity search                  │
│  3. Retrieve top-K HS codes + กฎระเบียบ + คดีความ       │
│       ↓                                                 │
│  Return results with confidence จากฐานข้อมูลจริง        │
│  (ไม่ใช่ AI เดาอีกต่อไป)                                │
└─────────────────────────────────────────────────────────┘
```

### Components ที่ต้องเพิ่ม (ไม่เพิ่ม container ใหม่):

| Component | ที่อยู่ | Resource เพิ่ม |
|-----------|--------|---------------|
| pgvector extension | PostgreSQL เดิม | ~0 (shared memory) |
| HNSW Index (~12K HS codes) | PostgreSQL เดิม | ~50-100 MB RAM |
| Embedding API | Gemini `text-embedding-004` (external) | 0 CPU / 0 RAM |
| Semantic search endpoint | Backend เดิม | 0 (ใช้ CPU เดิม) |
| Ingestion workflow | n8n worker เดิม | 0 (ใช้ CPU เดิม) |
| Document storage | S3 (Cloudflare R2) | 0 (external) |

**Resource impact รวม: ~50-100 MB RAM เพิ่มใน PostgreSQL → ไม่ละเมิด The 1.9 Rule**

---

## 4. Database Changes

### 4.1 เพิ่ม pgvector extension

```sql
-- init-db.sh (เพิ่มบรรทัดนี้)
CREATE EXTENSION IF NOT EXISTS vector;
```

> Note: postgres:16-alpine รองรับ pgvector ต้องเปลี่ยน image เป็น `pgvector/pgvector:pg16`

### 4.2 Migration V1001: เพิ่ม vector column ใน cg_hs_codes

```sql
-- V1001__hs_codes_vector.sql
ALTER TABLE cg_hs_codes
    ADD COLUMN embedding vector(768);

-- HNSW index สำหรับ cosine similarity
CREATE INDEX idx_hs_codes_embedding
    ON cg_hs_codes
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### 4.3 Migration V1002: ตาราง document chunks

```sql
-- V1002__document_chunks.sql
CREATE TABLE cg_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL,          -- 'REGULATION', 'CASE_LAW', 'FTA', 'CIRCULAR'
    source_url TEXT,
    s3_key TEXT,                     -- path ใน S3
    status TEXT DEFAULT 'PENDING',   -- PENDING, PROCESSING, COMPLETED, FAILED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cg_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    document_id UUID NOT NULL REFERENCES cg_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}',     -- page_number, section, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cg_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON cg_documents AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON cg_document_chunks AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- HNSW index
CREATE INDEX idx_doc_chunks_embedding
    ON cg_document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

---

## 5. Resource Impact Assessment

### ก่อน RAG:
```
PostgreSQL: 0.4 CPU / 1.5 GB RAM
```

### หลัง RAG (เพิ่ม pgvector):
```
PostgreSQL: 0.4 CPU / 1.5 GB RAM (+50-100 MB สำหรับ HNSW index)
```

### คำนวณ HNSW Index Size:
- HS Codes: ~12,000 records × 768 dims × 4 bytes = ~35 MB
- Document chunks: ~10,000 chunks × 768 dims × 4 bytes = ~29 MB
- HNSW graph overhead: ~2x = ~128 MB
- **รวม: ~130 MB (อยู่ใน 1.5 GB ของ PostgreSQL ได้สบาย)**

### Embedding API Cost (Gemini text-embedding-004):
- Free tier: 1,500 RPM / 1M tokens/min
- HS Code 12,000 records = ~1 batch job (~5 นาที)
- Document chunks 10,000 = ~1 batch job (~10 นาที)
- Query: 1 API call per search (~100ms)
- **Cost: $0 (free tier เพียงพอ)**

### สรุป: ผ่านทุกกฎ
| กฎ | สถานะ |
|----|-------|
| The 1.9 Rule (CPU ≤ 1.9) | PASS — ไม่เพิ่ม CPU |
| RAM ≤ 8 GB | PASS — เพิ่มแค่ ~130 MB ใน PostgreSQL |
| Binary-Free Rule | PASS — เอกสารเก็บ S3 |
| Stateless Logic | PASS — vector อยู่ใน DB |
| No new containers | PASS — ใช้ service เดิมทั้งหมด |

---

## 6. ข้อมูลที่ต้องรวบรวม (Data Sources)

### Priority 1: HS Code Database
| แหล่ง | รายละเอียด | ปริมาณ |
|-------|-----------|--------|
| กรมศุลกากร (customs.go.th) | พิกัดอัตราศุลกากร | ~12,000 รายการ |
| อัตราอากร | อัตราภาษีนำเข้าแต่ละพิกัด | ~12,000 รายการ |
| WCO HS Nomenclature | คำอธิบาย EN/TH | ~5,000 headings |

### Priority 2: กฎระเบียบ
| แหล่ง | รายละเอียด | ปริมาณ |
|-------|-----------|--------|
| ประกาศกรมศุลกากร | กฎระเบียบนำเข้า-ส่งออก | ~500 ฉบับ |
| พ.ร.บ.ศุลกากร | กฎหมายหลัก | ~10 ฉบับ |
| ประกาศกระทรวงการคลัง | อัตราอากรพิเศษ | ~200 ฉบับ |

### Priority 3: คดีความ & คำวินิจฉัย
| แหล่ง | รายละเอียด | ปริมาณ |
|-------|-----------|--------|
| คำวินิจฉัยพิกัด | คำตอบข้อหารือ HS Code | ~1,000 ฉบับ |
| คดีศุลกากร | คำพิพากษา | ~300 คดี |
| Advance Ruling | การวินิจฉัยล่วงหน้า | ~200 ฉบับ |

### Priority 4: FTA & สิทธิพิเศษ
| แหล่ง | รายละเอียด | ปริมาณ |
|-------|-----------|--------|
| AFTA/ATIGA | อัตราอากร ASEAN | ~12,000 รายการ |
| JTEPA, TAFTA, etc. | FTA ทวิภาคี | ~12,000 × 15 FTA |
| Form D, Form E, etc. | หนังสือรับรองถิ่นกำเนิด | เอกสารอ้างอิง |

---

## 7. Roadmap (3 Phases)

### Phase 1: Foundation — pgvector + HS Code Embedding (2-3 สัปดาห์)

```
เป้าหมาย: ค้นหา HS Code ด้วย semantic search ได้
```

**งานที่ต้องทำ:**

- [ ] เปลี่ยน Docker image: `postgres:16-alpine` → `pgvector/pgvector:pg16`
- [ ] เพิ่ม `CREATE EXTENSION vector` ใน `init-db.sh`
- [ ] สร้าง Migration V1001: เพิ่ม `embedding vector(768)` ใน `cg_hs_codes`
- [ ] สร้าง n8n workflow: Embed HS Code ทั้งหมด (batch job)
  - อ่าน HS Code จาก DB → chunk → เรียก Gemini Embedding API → อัพเดต vector column
- [ ] เพิ่ม Backend endpoint: `POST /v1/customsguard/hs-codes/semantic`
  - รับ query text → embed → pgvector cosine search → return top-K
- [ ] เพิ่ม `.env`: `GEMINI_EMBEDDING_API_KEY`
- [ ] ทดสอบ: ค้นหา "เสื้อผ้าสตรีทำจากผ้าฝ้าย" → ได้ HS Code 6204.62

**Resource check:** ไม่เปลี่ยน CPU/RAM allocation

---

### Phase 2: Document RAG — กฎระเบียบ + คดีความ (3-4 สัปดาห์)

```
เป้าหมาย: AI ตอบคำถามพร้อมอ้างอิงกฎระเบียบ/คดีได้
```

**งานที่ต้องทำ:**

- [ ] สร้าง Migration V1002: ตาราง `cg_documents` + `cg_document_chunks`
- [ ] สร้าง API: `POST /v1/customsguard/documents/upload` (presigned URL → S3)
- [ ] สร้าง n8n workflow: Document Ingestion Pipeline
  - S3 trigger → download PDF → extract text → chunk (512 tokens, 50 overlap) → embed → store
- [ ] สร้าง API: `POST /v1/customsguard/knowledge/search`
  - Hybrid search: pgvector similarity + keyword matching
  - Return: HS codes + related regulations + case law
- [ ] สร้าง n8n workflow: Scheduled re-embedding (เมื่อข้อมูลอัพเดต)
- [ ] Admin UI: หน้า upload เอกสาร + ดูสถานะ embedding

**Resource check:** Document chunks ~10K = ~29 MB vector data เพิ่ม

---

### Phase 3: Chrome Extension Integration (2-3 สัปดาห์)

```
เป้าหมาย: Chrome Extension ใช้ RAG backend แทน Gemini ตรง
```

**งานที่ต้องทำ:**

- [ ] แก้ Chrome Extension: Scan PDF → ส่ง extracted text ไป Backend RAG API
- [ ] Backend: รับ product description → semantic search HS Code → return พร้อม confidence จากฐานข้อมูลจริง
- [ ] แสดง evidence: "HS Code นี้ตรงกับคำวินิจฉัยที่ XXX"
- [ ] Traffic Light ใช้ similarity score จาก pgvector (ไม่ใช่ AI เดา)
- [ ] เพิ่ม: คำเตือนถ้ามีคดีความที่เกี่ยวข้อง (risk alert)
- [ ] เพิ่ม: แสดงอัตราอากร + FTA ที่ใช้ได้

**ผลลัพธ์สุดท้าย:**
```
ก่อน: AI เดา HS Code → confidence 60-80% (สีส้ม)
หลัง: AI + RAG ค้นจากฐานข้อมูลจริง → confidence 90%+ (สีเขียว)
       พร้อมอ้างอิงกฎระเบียบ คดีความ อัตราอากร
```

---

## สถาปัตยกรรมรวม (Final Architecture)

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│  PDF Upload → AI Scan → Review → Confirm → Fill Form        │
│                  ↕ (API call)                                │
├──────────────────────────────────────────────────────────────┤
│                     Nginx Proxy                              │
├──────────────────────────────────────────────────────────────┤
│                   Spring Boot Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ HS Code API  │  │ Document API │  │ Knowledge API│       │
│  │ LIKE + Vector│  │ Upload + S3  │  │ Hybrid Search│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           ↓                                  │
├──────────────────────────────────────────────────────────────┤
│              PostgreSQL 16 + pgvector                        │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐         │
│  │ cg_hs_codes │ │ cg_documents │ │ cg_doc_chunks │         │
│  │ +embedding  │ │ (metadata)   │ │ +embedding    │         │
│  └─────────────┘ └──────────────┘ └───────────────┘         │
├──────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Gemini Flash │  │ Gemini Embed │  │ Cloudflare   │       │
│  │ (AI Scan)    │  │ (Vectorize)  │  │ R2 (S3)      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

> "RAG ไม่ใช่แค่ทำให้ AI ฉลาดขึ้น แต่ทำให้ AI มีหลักฐานอ้างอิง — ซึ่งในงานศุลกากร หลักฐานสำคัญกว่าความเห็น"
