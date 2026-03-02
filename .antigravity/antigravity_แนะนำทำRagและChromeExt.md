# 🧠 คู่มือ Agentic AI: RAG & Chrome Extension (Phase 0–2)
> เขียนสำหรับ Agentic AI ที่จะ implement ระบบนี้ตั้งแต่ต้นจนจบ
> อ่านทั้งหมดก่อน implement เพราะแต่ละ Phase พึ่งพากัน

---

## 📐 Context ที่ต้องรู้ก่อน

- **Project:** VOLLOS AI-SaaS ระบบ Multi-tenant บน Docker Compose
- **Constraints:** 2 CPU / 8 GB RAM (ห้ามเกิน!) — อ่าน `infrastructure-devops.md`
- **Database:** PostgreSQL 16 + pgvector (image `pgvector/pgvector:pg16`)
- **AI Provider:** Google Gemini (`GEMINI_API_KEY` มีใน `.env` แล้ว)
- **Feature Module:** `feature-customsguard` แยกจาก `platform-core`
- **Chrome Extension:** อยู่ที่ `chrome-extension/cgai/` — Manifest V3, TypeScript, Vite, Dexie
- **Stack ที่ใช้งาน:** Java 21 + Spring Boot 3.5, n8n Queue Mode, Angular 21

---

## 🗂️ ภาพรวม Database Schema (เพิ่มใหม่ทั้งหมด)

```
Feature: customsguard
  ├── cg_hs_codes          ← HS Code + อัตราอากร (Shared/Global)
  ├── cg_fta_rates         ← FTA อัตราอากรพิเศษ (Shared/Global)
  ├── cg_regulations       ← ประกาศกรมศุลกากร (Shared/Global)
  ├── cg_rulings           ← คำวินิจฉัยพิกัด (Shared/Global)
  ├── cg_document_chunks   ← pgvector embeddings (Shared/Global, NO RLS)
  ├── cg_declarations      ← ใบขนของลูกค้า (Per-Tenant, RLS)
  └── cg_declaration_items ← รายการสินค้า (Per-Tenant, RLS)
```

> ⚠️ **กฎสำคัญ:** `cg_hs_codes`, `cg_fta_rates`, `cg_regulations`, `cg_rulings`, `cg_document_chunks` เป็น **Global Shared** — ไม่ต้อง RLS เพราะเป็น Knowledge Base สาธารณะทุก tenant ใช้ร่วมกัน

---

# Phase 0: Knowledge Base Ingestion Pipeline

**เป้าหมาย:** สร้าง Knowledge Base ที่ RAG จะใช้ค้นหา โดย AI เป็นคนทำทั้งหมด

## 0.1 สร้าง Database Migrations

สร้างไฟล์ใหม่ใน `feature-customsguard/src/main/resources/db/migration/customsguard/`

### ไฟล์ที่ต้องสร้าง:

#### `V1000__customsguard_knowledge_base.sql`

```sql
-- ========================================================
-- CustomsGuard: Knowledge Base Tables (Global / Shared)
-- ไม่ใช้ RLS เพราะเป็นข้อมูลสาธารณะทุก tenant ใช้ร่วม
-- ========================================================

-- Extension เปิดใช้ pgvector (ต้อง run ก่อนสร้าง table)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. HS Code Master: พิกัดอัตราศุลกากรไทย
CREATE TABLE IF NOT EXISTS cg_hs_codes (
    code         VARCHAR(12)  PRIMARY KEY,    -- เช่น "8471.30.10"
    section      SMALLINT,                    -- หมวด (1-21)
    chapter      SMALLINT,                    -- ตอน (01-99)
    heading      VARCHAR(6),                  -- หัวข้อ 4 หลัก เช่น "8471"
    subheading   VARCHAR(8),                  -- หัวข้อย่อย 6 หลัก เช่น "8471.30"
    description_th TEXT NOT NULL,
    description_en TEXT NOT NULL,
    base_rate    DECIMAL(6,2),               -- อัตราอากรปกติ (%)
    unit         VARCHAR(30),                -- หน่วยนับ เช่น "PIECE", "KG"
    search_vector TSVECTOR,                  -- Full-text search TH+EN
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cg_hs_heading   ON cg_hs_codes (heading);
CREATE INDEX idx_cg_hs_chapter   ON cg_hs_codes (chapter);
CREATE INDEX idx_cg_hs_fts       ON cg_hs_codes USING GIN (search_vector);

-- Trigger อัพเดท search_vector อัตโนมัติ
CREATE OR REPLACE FUNCTION cg_hs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.code, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_en, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_th, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cg_hs_fts
BEFORE INSERT OR UPDATE ON cg_hs_codes
FOR EACH ROW EXECUTE FUNCTION cg_hs_search_vector_update();

-- 2. FTA Rates: อัตราอากรพิเศษตาม FTA
CREATE TABLE IF NOT EXISTS cg_fta_rates (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code      VARCHAR(12)  NOT NULL REFERENCES cg_hs_codes(code),
    fta_name     VARCHAR(30)  NOT NULL,   -- 'ACFTA', 'JTEPA', 'TAFTA', 'AFTA'...
    country_code VARCHAR(3)   NOT NULL,   -- ISO 3166-1 alpha-3: 'CHN', 'JPN', 'AUS'...
    form_type    VARCHAR(15),             -- 'Form D', 'Form E', 'Form AJ'...
    rate         DECIMAL(6,2) NOT NULL,   -- อัตราอากรพิเศษ (%)
    effective_date DATE        NOT NULL,
    expiry_date    DATE,                  -- NULL = ยังใช้ได้
    conditions   TEXT,                    -- เงื่อนไข เช่น "Local content >= 40%"
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (hs_code, fta_name, country_code, effective_date)
);

CREATE INDEX idx_cg_fta_hs_country ON cg_fta_rates (hs_code, country_code);
CREATE INDEX idx_cg_fta_name       ON cg_fta_rates (fta_name);

-- 3. Regulations: ประกาศและกฎหมายศุลกากร
CREATE TABLE IF NOT EXISTS cg_regulations (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type     VARCHAR(30)  NOT NULL,   -- 'ANNOUNCEMENT', 'ACT', 'MINISTERIAL', 'RULING', 'CASE'
    doc_number   VARCHAR(100),            -- เลขที่ประกาศ
    title        TEXT         NOT NULL,
    issuer       VARCHAR(100),            -- กรมศุลกากร / กระทรวงการคลัง / ศาล
    issued_date  DATE,
    content      TEXT         NOT NULL,   -- เนื้อหาเต็ม (สำหรับ chunking)
    source_url   TEXT,
    effective_date DATE,
    related_hs_codes VARCHAR(12)[],       -- array ของ HS Code ที่เกี่ยวข้อง
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cg_reg_type     ON cg_regulations (doc_type);
CREATE INDEX idx_cg_reg_hs_codes ON cg_regulations USING GIN (related_hs_codes);

-- 4. Document Chunks: pgvector สำหรับ RAG
-- Global table ไม่ต้อง RLS — เป็น knowledge base สาธารณะ
CREATE TABLE IF NOT EXISTS cg_document_chunks (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id  UUID        REFERENCES cg_regulations(id) ON DELETE CASCADE,
    chunk_index    INT         NOT NULL,   -- ลำดับ chunk ภายใน document
    content        TEXT        NOT NULL,   -- เนื้อหา chunk (max ~512 tokens)
    content_summary TEXT,                 -- สรุปสั้นๆ เพื่อช่วย reranking
    embedding      vector(768) NOT NULL,  -- Gemini text-embedding-004 = 768 dims
    metadata       JSONB       DEFAULT '{}'::jsonb,  -- ข้อมูลเพิ่มเติม
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Index: เร็วกว่า IVFFlat, ไม่ต้อง train, เหมาะกับ dataset ขนาดนี้
CREATE INDEX idx_cg_chunks_hnsw ON cg_document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Partial index สำหรับดึง chunk ตาม regulation
CREATE INDEX idx_cg_chunks_reg ON cg_document_chunks (regulation_id, chunk_index);
```

---

## 0.2 สร้าง ETL Script (n8n Workflow)

สร้างไฟล์ `infra/n8n-workflows/cg-knowledge-ingestion.json`

### Workflow Architecture:

```
TRIGGER (Manual หรือ Schedule รายสัปดาห์)
    │
    ├── Branch 1: HS Code Scraper
    │       → HTTP GET customs.go.th/tariff
    │       → Code Node: Parse HTML table
    │       → Code Node: Clean & Normalize
    │       → PostgreSQL: Upsert cg_hs_codes
    │
    ├── Branch 2: FTA Rate Scraper  
    │       → HTTP GET dft.go.th/fta-rates (กรมการค้าต่างประเทศ)
    │       → Code Node: Parse per FTA per HS Code
    │       → PostgreSQL: Upsert cg_fta_rates
    │
    └── Branch 3: Regulation Embedder
            → PostgreSQL: SELECT ยังไม่ embed (WHERE processed = false)
            → Loop:
                → Code Node: Split content → chunks (512 tokens each)
                → HTTP POST Gemini embeddings API (batch 100 chunks)
                → PostgreSQL: Insert cg_document_chunks
```

### n8n Code Node สำหรับ Chunking (JavaScript):

```javascript
// Input: items[0].json.content (เนื้อหาเต็ม)
// Output: array of chunks
const content = items[0].json.content;
const MAX_TOKENS = 512;
const OVERLAP = 50; // tokens overlap ระหว่าง chunks

// Thai-aware sentence splitter
const sentences = content
  .split(/(?<=[.!?ๆ])\s+|(?<=\n)\s*/)
  .filter(s => s.trim().length > 0);

const chunks = [];
let currentChunk = '';
let currentTokens = 0;

for (const sentence of sentences) {
  const sentenceTokens = Math.ceil(sentence.length / 4); // approx Thai
  
  if (currentTokens + sentenceTokens > MAX_TOKENS && currentChunk) {
    chunks.push({
      content: currentChunk.trim(),
      chunk_index: chunks.length
    });
    // Keep last OVERLAP tokens for next chunk
    const words = currentChunk.split(' ');
    currentChunk = words.slice(-Math.ceil(OVERLAP/4)).join(' ') + ' ';
    currentTokens = OVERLAP;
  }
  
  currentChunk += sentence + ' ';
  currentTokens += sentenceTokens;
}

if (currentChunk.trim()) {
  chunks.push({ content: currentChunk.trim(), chunk_index: chunks.length });
}

return chunks.map(chunk => ({ json: chunk }));
```

### n8n Code Node สำหรับ Embed (Gemini API):

```javascript
// Input: array ของ chunks
// Config: GEMINI_API_KEY จาก n8n credentials
const chunks = items.map(item => item.json.content);
const regulationId = $('PostgreSQL').first().json.id;

// Batch embed (max 100 per request)
const BATCH_SIZE = 100;
const results = [];

for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=' + $credentials.geminiApiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: batch.map(text => ({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT'
        }))
      })
    }
  );
  
  const data = await response.json();
  
  data.embeddings.forEach((emb, idx) => {
    results.push({
      regulation_id: regulationId,
      chunk_index: i + idx,
      content: batch[idx],
      // pgvector format: '[0.1, 0.2, ...]'
      embedding: '[' + emb.values.join(',') + ']'
    });
  });
}

return results.map(r => ({ json: r }));
```

---

## 0.3 Script สำหรับ Import ข้อมูลครั้งแรก

สร้าง `infra/scripts/cg-initial-import.py` สำหรับ Bootstrap ข้อมูลครั้งแรก:

```python
"""
CustomsGuard Initial Data Import
รัน: python cg-initial-import.py --source customs.go.th --target postgres
ต้องการ: requests, beautifulsoup4, psycopg2-binary, python-dotenv
"""
import os
import re
import time
import requests
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")  # postgresql://user:pass@localhost:5432/db

def scrape_hs_codes():
    """Scrape HS Codes จาก customs.go.th"""
    base_url = "https://igtf.customs.go.th/igtf/th/main_frame.jsp"
    # TODO: implement chapter-by-chapter scraping
    # chapters 01-99 → GET request each
    pass

def scrape_fta_rates():
    """Scrape FTA rates จาก กรมการค้าต่างประเทศ"""
    # dft.go.th → export CSV by FTA
    pass

def embed_regulation(content: str, gemini_api_key: str) -> list[float]:
    """Embed text using Gemini text-embedding-004"""
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_api_key}",
        json={
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": content}]},
            "taskType": "RETRIEVAL_DOCUMENT"
        }
    )
    return resp.json()["embedding"]["values"]

if __name__ == "__main__":
    print("CustomsGuard Initial Import Starting...")
    # Phase 1: HS Codes (12,000 records)
    # Phase 2: FTA Rates (180,000 records — batch by FTA)
    # Phase 3: Embed Regulations from PDF files in infra/data/regulations/
```

---

# Phase 1: Extension → Backend API Migration

**เป้าหมาย:** Extension ไม่ยิง AI โดยตรงอีกต่อไป ทุกอย่างผ่าน VOLLOS Backend

## 1.1 Backend: สร้าง API Endpoints ใหม่

สร้างไฟล์ใน `feature-customsguard/src/main/java/com/vollos/feature/customsguard/`

### 1.1.1 `ScanController.java`

```
Endpoint: POST /v1/customsguard/scan
Auth: Bearer JWT (ต้องมี @RequiresFeature("customsguard"))
Content-Type: multipart/form-data

Input:
  - file: PDF binary (max 10MB ตาม Nginx limit)
  
Flow:
  1. Validate ขนาดไฟล์ ≤ 10MB
  2. Upload PDF ไป S3 → ได้ s3Key กลับมา
  3. สร้าง ai_job record (status = CREATED)
  4. บันทึก outbox_event (type = "CG_SCAN_REQUESTED")
  5. Return 202 Accepted { jobId: "uuid" }

Note: ไม่ต้องทำ OCR ใน request นี้ — ให้ n8n Worker ทำใน background
```

### 1.1.2 `HsCodeController.java`

```
Endpoint: POST /v1/customsguard/hs/lookup
Auth: Bearer JWT
Content-Type: application/json

Input:
  {
    "codes": ["8471.30", "3926.20"],  // array สอบถามพร้อมกัน
    "originCountry": "CN",            // optional: สำหรับ FTA check
    "declarationType": "IMPORT"       // "IMPORT" | "EXPORT"
  }

Flow:
  1. Query cg_hs_codes WHERE code = ANY({codes})
  2. ถ้ามี originCountry → Query cg_fta_rates WHERE hs_code IN ({codes}) AND country_code = {originCountry}
  3. สร้าง FtaAlert ถ้า fta_rate < base_rate
  4. Return enriched data พร้อม alerts

Output:
  {
    "results": [
      {
        "code": "8471.30",
        "descriptionTh": "...",
        "descriptionEn": "...",
        "baseRate": 5.0,
        "ftaAlerts": [
          {
            "ftaName": "ACFTA",
            "ftaRate": 0.0,
            "formType": "Form E",
            "saving": "ประหยัดจาก 5% → 0%",
            "conditions": "Local content >= 40%"
          }
        ]
      }
    ]
  }
```

### 1.1.3 `RagController.java`

```
Endpoint: POST /v1/customsguard/rag/search
Auth: Bearer JWT
Content-Type: application/json

Input:
  {
    "query": "สินค้า laptop HS code ควรจำแนกยังไง ถ้าโดน audit",
    "hsCode": "8471.30",      // optional filter
    "docTypes": ["RULING", "CASE", "ANNOUNCEMENT"],  // filter ประเภทเอกสาร
    "topK": 5                 // จำนวน chunks ที่ต้องการ
  }

Flow:
  1. Embed query ด้วย Gemini text-embedding-004 (taskType: RETRIEVAL_QUERY)
  2. pgvector similarity search:
     SELECT regulation_id, content, 1 - (embedding <=> query_vector) AS score
     FROM cg_document_chunks
     ORDER BY embedding <=> query_vector
     LIMIT {topK * 2}  -- over-fetch สำหรับ reranking
  3. Join กับ cg_regulations เพื่อเอา metadata
  4. Filter ตาม docTypes ถ้ามี
  5. Call Gemini Pro เพื่อ synthesize คำตอบ โดย inject chunks เป็น context
  6. Return ทั้ง synthesized answer และ source citations

Output:
  {
    "answer": "จากคำวินิจฉัยที่ 45/2563 สินค้าประเภท...",
    "sources": [
      {
        "docNumber": "45/2563",
        "title": "คำวินิจฉัยพิกัดสินค้า Laptop...",
        "docType": "RULING",
        "relevanceScore": 0.92,
        "excerpt": "...เนื้อหาที่เกี่ยวข้อง..."
      }
    ]
  }
```

### 1.1.4 RAG Service Implementation (Java)

```java
// RagService.java — เรียก Gemini API สำหรับทั้ง embedding และ generation

// 1. Embed query
String embeddedQuery = geminiClient.embedText(query, TaskType.RETRIEVAL_QUERY);

// 2. pgvector similarity search (ใช้ Spring JPA Native Query)
@Query(value = """
    SELECT dc.id, dc.content, dc.regulation_id, dc.metadata,
           1 - (dc.embedding <=> CAST(:queryVector AS vector)) AS score
    FROM cg_document_chunks dc
    JOIN cg_regulations r ON r.id = dc.regulation_id
    WHERE (:docTypes IS NULL OR r.doc_type = ANY(CAST(:docTypes AS text[])))
    ORDER BY dc.embedding <=> CAST(:queryVector AS vector)
    LIMIT :limit
    """, nativeQuery = true)
List<ChunkSearchResult> searchSimilar(
    @Param("queryVector") String queryVector,
    @Param("docTypes") String[] docTypes,
    @Param("limit") int limit
);

// 3. Build RAG prompt
String ragPrompt = """
    คุณคือผู้เชี่ยวชาญด้านพิธีการศุลกากรไทย
    ตอบคำถามโดยอ้างอิงข้อมูลที่ให้มาเท่านั้น
    ถ้าข้อมูลไม่เพียงพอ ให้บอกว่าไม่ทราบ อย่าเดา
    
    เอกสารอ้างอิง:
    %s
    
    คำถาม: %s
    """.formatted(contextFromChunks, userQuery);
```

---

## 1.2 Chrome Extension: แก้ให้ใช้ Backend API

### ไฟล์ที่ต้องแก้:

#### `src/background/ai-proxy.ts` → แก้โดยสิ้นเชิง

```typescript
// เดิม: ยิง Gemini โดยตรง
// ใหม่: ยิงผ่าน VOLLOS Backend API

const VOLLOS_API_BASE = 'https://api.vollos.app/v1'; // หรือ env config

interface BackendScanResult {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  items?: ExtractedLineItem[];
}

export async function scanViaBackend(
  pdfBase64: string,
  jwtToken: string
): Promise<BackendScanResult> {
  // แปลง base64 → Blob → FormData
  const blob = base64ToBlob(pdfBase64, 'application/pdf');
  const formData = new FormData();
  formData.append('file', blob, 'document.pdf');

  const response = await fetch(`${VOLLOS_API_BASE}/customsguard/scan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'X-Tenant-ID': await getTenantId()  // จาก chrome.storage
    },
    body: formData
  });

  if (!response.ok) throw new Error(`Scan failed: ${response.status}`);
  return response.json();
}

export async function lookupHsCodes(
  codes: string[],
  originCountry?: string,
  jwtToken?: string
): Promise<HsLookupResult> {
  const response = await fetch(`${VOLLOS_API_BASE}/customsguard/hs/lookup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': await getTenantId()
    },
    body: JSON.stringify({ codes, originCountry, declarationType: 'IMPORT' })
  });

  return response.json();
}

export async function ragSearch(
  query: string,
  hsCode?: string,
  jwtToken?: string
): Promise<RagSearchResult> {
  const response = await fetch(`${VOLLOS_API_BASE}/customsguard/rag/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': await getTenantId()
    },
    body: JSON.stringify({
      query,
      hsCode,
      docTypes: ['RULING', 'CASE', 'ANNOUNCEMENT'],
      topK: 5
    })
  });

  return response.json();
}
```

#### `manifest.json` → แก้ `host_permissions`

```json
{
  "host_permissions": [
    "https://*.customs.go.th/*",
    "https://api.vollos.app/*",
    "https://localhost/*"
  ]
}
```

> หมายเหตุ: ลบ `https://generativelanguage.googleapis.com/*` ออก ไม่จำเป็นแล้ว

#### `src/lib/auth.ts` → สร้างใหม่ (JWT Management)

```typescript
// เก็บ JWT Token ใน chrome.storage.local (encrypt)
export async function getJwtToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('vollosJwt');
  return result.vollosJwt ?? null;
}

export async function setJwtToken(token: string): Promise<void> {
  await chrome.storage.local.set({ vollosJwt: token });
}

export async function getTenantId(): Promise<string | null> {
  const result = await chrome.storage.local.get('vollosTenantId');
  return result.vollosTenantId ?? null;
}

// Login จะต้องทำใน Side Panel UI: เรียก POST /v1/auth/login
// แล้ว store token
```

---

## 1.3 Extension: ระบบ SSE สำหรับ Job Status

เมื่อ scan เสร็จ backend ตอบ `202 Accepted { jobId }` — Extension ต้องติดตามสถานะ:

```typescript
// src/lib/job-tracker.ts
export function trackJob(
  jobId: string,
  jwtToken: string,
  onComplete: (items: ExtractedLineItem[]) => void,
  onError: (err: string) => void
): EventSource {
  const url = `${VOLLOS_API_BASE}/jobs/stream?jobId=${jobId}`;
  
  const es = new EventSource(url, {
    // EventSource ไม่รองรับ custom headers โดยตรง
    // ต้องส่ง token เป็น query param (Backend ต้อง support)
  });

  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'COMPLETED') {
      onComplete(data.items);
      es.close();
    } else if (data.status === 'FAILED') {
      onError(data.error);
      es.close();
    }
    // PROCESSING: อัพเดท progress bar
  };

  return es;
}
```

---

# Phase 2: RAG Integration ใน Extension

**เป้าหมาย:** Extension ฉลาดขึ้น — ไม่แค่อ่านตัวเลข แต่เข้าใจกฎหมายและเตือนเรื่อง FTA

## 2.1 HS Code Enrichment หลัง Scan

หลังจาก scan เสร็จ และได้ `items` กลับมา Extension ต้องทำ step เพิ่ม:

```typescript
// หลัง scan complete, แทนที่จะแสดงผลทันที:
async function enrichItemsWithRag(
  items: ExtractedLineItem[],
  originCountry: string,
  jwtToken: string
): Promise<EnrichedLineItem[]> {
  
  // 1. Batch lookup HS Codes ทั้งหมดพร้อมกัน (1 API call)
  const codes = [...new Set(items.map(i => i.hsCode))];
  const hsData = await lookupHsCodes(codes, originCountry, jwtToken);
  
  // 2. สร้าง Map สำหรับ lookup เร็ว
  const hsMap = new Map(hsData.results.map(r => [r.code, r]));
  
  // 3. Enrich แต่ละ item
  return items.map(item => ({
    ...item,
    // ข้อมูลจาก Knowledge Base
    hsDescription: hsMap.get(item.hsCode)?.descriptionTh,
    baseRate: hsMap.get(item.hsCode)?.baseRate,
    
    // FTA Alerts (สำคัญมาก!)
    ftaAlerts: hsMap.get(item.hsCode)?.ftaAlerts ?? [],
    
    // ปรับ confidence: ถ้า hsCode ไม่พบใน DB = แดงทันที
    confidence: hsMap.has(item.hsCode) 
      ? item.confidence 
      : 0.1,  // ไม่พบใน DB = ต้องตรวจสอบ
    aiReason: !hsMap.has(item.hsCode)
      ? 'HS Code นี้ไม่พบในฐานข้อมูล กรุณาตรวจสอบ'  
      : item.aiReason
  }));
}
```

## 2.2 Side Panel UI: FTA Alert Banner

เพิ่ม Component ใหม่ใน Side Panel สำหรับแสดง FTA Alerts:

```
┌────────────────────────────────────────────────────────┐
│ 🤖 AI Scan Results                            [Refresh]│
├────────────────────────────────────────────────────────┤
│                                                        │
│ ⚡ FTA OPPORTUNITY DETECTED                             │
│ ┌──────────────────────────────────────────────────┐   │
│ │ HS 8471.30 × Origin: China                       │   │
│ │ Form E (ACFTA): 5% → 0% | ประหยัด: ~฿15,000    │   │
│ │ เงื่อนไข: Local content ≥ 40%      [รายละเอียด] │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ LINE ITEMS                                   [Confirm] │
│ ┌──────┬──────────────┬──────┬──────────────────────┐  │
│ │  🟡  │ 8471.30      │ 5%   │ Laptop (ของจีน)       │  │
│ │  🟢  │ 3923.21      │ 10%  │ Plastic Box           │  │
│ └──────┴──────────────┴──────┴──────────────────────┘  │
│                                                        │
│ 💬 ถามผู้เชี่ยวชาญ AI                                  │
│ ┌──────────────────────────────────────────────────┐   │
│ │ [ถ้าโดน audit สำหรับ 8471.30 ควรสู้ยังไง?]      │   │
│ │                                       [ถาม AI ▶] │   │
│ └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## 2.3 Chat Panel: RAG Search UI Component

```typescript
// Component: AiChatPanel.tsx (or .js ถ้าไม่ใช้ React)
// ให้ user ถามคำถามเกี่ยวกับ HS Code ที่อยู่ในใบขน

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[];  // citations จาก backend
  timestamp: Date;
}

// เมื่อ user ถาม:
async function handleAiQuestion(question: string) {
  // Auto-inject HS Code context จาก items ที่ scan แล้ว
  const activeHsCodes = currentItems.map(i => i.hsCode);
  const contextualQuestion = `
    [Context: สินค้าในใบขนนี้ได้แก่ ${activeHsCodes.join(', ')}]
    คำถาม: ${question}
  `;
  
  const result = await ragSearch(
    contextualQuestion,
    activeHsCodes[0],  // primary HS code
    jwtToken
  );
  
  // แสดงคำตอบ + citations
  addMessage({
    role: 'assistant',
    content: result.answer,
    sources: result.sources
  });
}
```

## 2.4 Traffic Light Logic อัพเดท (V2)

ปรับ `getTrafficColor()` ใน `types/index.ts` ให้รองรับข้อมูลจาก Knowledge Base:

```typescript
export type TrafficLightColor = 'gold' | 'orange' | 'red' | 'blue' | 'green';

export function getTrafficColor(item: EnrichedDeclarationItem): TrafficLightColor {
  // Blue = user แก้ไขเองแล้ว
  if (item.editStatus === 'CONFIRMED') return 'gold';
  if (item.editStatus === 'EDITED') return 'blue';
  
  // Red ทันที: HS Code ไม่พบใน Knowledge Base
  if (!item.foundInKnowledgeBase) return 'red';
  
  // จาก AI confidence
  if (item.confidence > 0.9) return 'gold';   // แทน 'green' ตามสี Feature doc
  if (item.confidence >= 0.6) return 'orange';
  return 'red';
}
```

---

# 📋 Checklist สำหรับ Agentic AI

## Phase 0 ✅ Done When:
- [ ] `V1000__customsguard_knowledge_base.sql` migration รันสำเร็จ ไม่มี error
- [ ] `cg_hs_codes` รับ insert ได้ และ `search_vector` trigger ทำงาน
- [ ] `cg_document_chunks` มี HNSW index
- [ ] n8n workflow import ได้ และ test run สำเร็จ
- [ ] มีข้อมูล seed อย่างน้อย 100 HS Codes สำหรับ test
- [ ] RAG search คืนผลลัพธ์ภายใน 500ms (เช็คด้วย `EXPLAIN ANALYZE`)

## Phase 1 ✅ Done When:
- [ ] `POST /v1/customsguard/scan` รับ PDF และ return `202 { jobId }`
- [ ] `POST /v1/customsguard/hs/lookup` return HS data + FTA alerts
- [ ] `POST /v1/customsguard/rag/search` return answer + sources
- [ ] Extension `ai-proxy.ts` ไม่มี reference ถึง `generativelanguage.googleapis.com` อีกต่อไป
- [ ] Extension ส่ง JWT header ทุก request
- [ ] รัน `npm run build` ใน Extension ไม่มี TypeScript error
- [ ] ลบ `https://generativelanguage.googleapis.com/*` ออกจาก `manifest.json` host_permissions

## Phase 2 ✅ Done When:
- [ ] หลัง scan: FTA Alert แสดงใน Side Panel ถ้ามีสิทธิ์ FTA
- [ ] Traffic light ใช้ข้อมูลจาก Knowledge Base ไม่ใช่แค่ AI confidence
- [ ] Chat Panel: user ถามเรื่อง HS Code ได้และได้คำตอบพร้อม citations
- [ ] HS Code ที่ไม่พบใน DB แสดงเป็น RED พร้อม warning message

---

# ⚠️ กฎที่ห้ามละเมิด

1. **Resource:** Backend endpoints ต้องจำกัด request: PDF scan max 10MB, Embedding max 100 chunks/call
2. **Stateless:** ไม่เก็บ PDF ไว้ใน container filesystem — upload S3 ทันที แล้วลบ
3. **Security:** JWT ต้องถูก validate ทุก request ใน Spring Security filter chain — ไม่มี bypass
4. **RLS:** Knowledge Base tables ไม่ต้อง RLS แต่ Declaration tables ต้องมี RLS ทุก table
5. **CPU:** Gemini embedding call ทำใน n8n worker ไม่ใช่ใน Java Backend thread (เพราะ blocking I/O)
6. **No Native Build on Production:** ถ้าต้อง rebuild JAR ต้องทำผ่าน CI/CD เท่านั้น

---

> เอกสารนี้เขียนโดย Antigravity | 2026-03-02
> อัพเดททุกครั้งที่ architecture เปลี่ยน
