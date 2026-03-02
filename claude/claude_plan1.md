# CustomsGuard RAG System — Phase 0-2 Implementation Plan

## Context

โปรเจค VOLLOS AI-SaaS มี CustomsGuard feature ที่ทำ AI-powered HS Code classification จาก Phase 1 เราได้ semantic search + pgvector พื้นฐานแล้ว แต่ยังขาด:
- Knowledge Base ที่แท้จริง (HS Codes เป็น per-tenant อยู่ ควรเป็น Global/Shared)
- FTA rates, regulations, document chunks สำหรับ RAG
- Backend API สำหรับ scan/lookup/rag (Extension ยังยิง Gemini ตรง)
- Infrastructure fixes (CPU เกิน budget, n8n ขาด config)

**เป้าหมาย:** เปลี่ยน CustomsGuard จาก "AI อ่าน PDF" เป็น "ระบบผู้เชี่ยวชาญศุลกากรอัจฉริยะ" ที่มี Knowledge Base, FTA alerts, และ RAG search

**User Decisions:**
- `cg_hs_codes` → Global/Shared (ไม่มี RLS, ไม่มี tenant_id)
- Embedding model → `text-embedding-004` (768 dims แทน 3072)
- Scope → ทำทั้ง Phase 0-2

---

## Phase 0: Infrastructure & Knowledge Base

### 0.1 แก้ Docker CPU Budget + n8n Config
**File:** `docker-compose.yml`

| Service | เดิม | ใหม่ |
|---------|------|------|
| postgres | 0.5 | 0.5 |
| redis | 0.2 | 0.15 |
| backend | 0.8 | 0.6 |
| n8n | 0.1 | 0.1 |
| n8n-worker | 0.3 | 0.25 |
| marketing | 0.2 | 0.1 |
| nginx | 0.1 | 0.1 |
| **รวม** | **2.2** | **1.8** |

เพิ่มให้ n8n main:
- `restart: always`
- `depends_on` postgres + redis (health check)

### 0.2 Breaking Migration — cg_hs_codes จาก Per-Tenant เป็น Global
**New file:** `.../db/features/customsguard/V1002__hs_codes_global_refactor.sql`

- DROP RLS policy + table เดิม
- สร้างใหม่: PK = `code VARCHAR(12)` (ไม่มี tenant_id)
- เพิ่ม fields: `section`, `chapter`, `heading`, `subheading`, `base_rate`, `unit`, `search_vector TSVECTOR`
- เปลี่ยน embedding เป็น `vector(768)` — รองรับ HNSW index ได้แล้ว
- สร้าง HNSW index + GIN index สำหรับ full-text search
- สร้าง trigger auto-update `search_vector`

### 0.3 Knowledge Base Tables ใหม่
**New file:** `.../db/features/customsguard/V1003__knowledge_base_tables.sql`

- `cg_fta_rates` — FTA อัตราอากรพิเศษ (Global, ไม่มี RLS)
- `cg_regulations` — ประกาศ/คำวินิจฉัย/กฎหมาย (Global)
- `cg_document_chunks` — pgvector embeddings สำหรับ RAG (768 dims, HNSW index)

### 0.4 Update application.yml
**File:** `backend-core/platform-app/src/main/resources/application.yml`

- embedding model: `gemini-embedding-001` → `text-embedding-004`
- dimensions: `3072` → `768`
- URL: update ให้ตรงกับ model ใหม่
- เพิ่ม gemini.chat config (gemini-2.5-flash)
- เพิ่ม s3 config section

### 0.5 Refactor Java Backend — HsCodeEntity (ลบ tenantId)
**File:** `.../entity/HsCodeEntity.java`

- ลบ `extends BaseEntity` (PK เปลี่ยนจาก UUID เป็น String code)
- ลบ `tenantId` field
- เพิ่ม: `section`, `chapter`, `heading`, `subheading`, `baseRate`, `unit`
- `@Id` ย้ายไปที่ `code`

### 0.6 New Entities
- **`.../entity/FtaRateEntity.java`** — extends BaseEntity, fields: hsCode, ftaName, partnerCountry, preferentialRate, conditions, effectiveFrom/To
- **`.../entity/RegulationEntity.java`** — extends BaseEntity, fields: title, body, regulationType, publishedAt, hsCodes[], tags[]
- **`.../entity/DocumentChunkEntity.java`** — extends BaseEntity, fields: sourceType, sourceId, chunkIndex, chunkText, metadata JSONB

### 0.7 Refactor Repositories
**File:** `.../repository/HsCodeRepository.java`
- เปลี่ยนเป็น `JpaRepository<HsCodeEntity, String>`
- ลบ tenantId จากทุก query
- เพิ่ม `fullTextSearch()` native query ใช้ `search_vector @@ plainto_tsquery`

**New:** `.../repository/FtaRateRepository.java`
- `findByHsCode()`, `findByHsCodeAndPartnerCountry()`

**New:** `.../repository/DocumentChunkRepository.java`
- `findBySemantic()` — pgvector cosine similarity search

### 0.8 Refactor Services & Controllers
- **HsCodeService** — ลบ tenantId จากทุก method
- **HsCodeController** — ลบ TenantContext.getCurrentTenantId() จาก HS operations
- **GeminiEmbeddingService** — ไม่ต้องแก้โค้ด (config จาก application.yml เปลี่ยนพอ)

### 0.9 Update DTOs
- **HsCodeResponse** — เปลี่ยน `UUID id` เป็น `String code`, เพิ่ม `baseRate`, `unit`, `section`, `chapter`
- **SemanticSearchResponse** — เปลี่ยน PK เป็น code, เพิ่ม `baseRate`

**Phase 0 Verification:**
- `./gradlew clean build` ผ่าน
- Flyway migration V1002 + V1003 รันสำเร็จ
- `\d cg_hs_codes` ไม่มี tenant_id, มี vector(768), HNSW index
- `POST /hs-codes/seed` + `POST /hs-codes/embed-all` ทำงานได้
- `POST /hs-codes/semantic` ค้นหา vector ได้
- `docker compose config` CPU รวม ≤ 1.9

---

## Phase 1: Backend API

### 1.1 JWT Authentication
**File:** `.../core/config/SecurityConfig.java`
- เพิ่ม JWT filter สำหรับ `/v1/**` endpoints
- `/actuator/**` ยังคง permitAll

**New:** `.../core/config/JwtAuthenticationFilter.java`
- OncePerRequestFilter: อ่าน Bearer token, validate, set SecurityContext + TenantContext

### 1.2 S3 Storage Service
**New:** `.../service/S3StorageService.java`
- `uploadPdf(byte[], key)` → upload to S3
- `downloadPdf(key)` → download from S3

**File:** `feature-customsguard/build.gradle.kts`
- เพิ่ม `software.amazon.awssdk:s3` dependency

### 1.3 Scan Endpoint (PDF Upload → Async Processing)
**New:** `.../controller/ScanController.java`
- `POST /v1/customsguard/scan` — multipart PDF upload → 202 Accepted
- `GET /v1/customsguard/scan/{jobId}` — poll status

**New:** `.../service/ScanService.java`
- Upload PDF to S3 (ไม่เก็บใน container)
- สร้าง ai_job (status=CREATED)
- สร้าง cg_declarations (status=PROCESSING)
- Insert outbox_event (type=CUSTOMSGUARD_SCAN)

**New DTOs:** `ScanJobResponse`

### 1.4 HS Lookup Endpoint (Batch + FTA Alerts)
**New:** `.../controller/HsLookupController.java`
- `POST /v1/customsguard/hs/lookup`

**New:** `.../service/HsLookupService.java`
- Batch lookup HS codes
- Join กับ cg_fta_rates ถ้ามี originCountry
- สร้าง FtaAlert ถ้า preferentialRate < baseRate

**New DTOs:** `HsLookupRequest`, `HsLookupResponse`, `FtaAlertDto`

### 1.5 RAG Search Endpoint
**New:** `.../controller/RagController.java`
- `POST /v1/customsguard/rag/search`

**New:** `.../service/RagService.java`
1. Embed query ด้วย text-embedding-004
2. pgvector similarity search จาก cg_document_chunks
3. Build context จาก top-K chunks
4. Call Gemini 2.5 Flash เพื่อ synthesize answer
5. Return answer + source citations

**New:** `.../service/GeminiChatService.java`
- Call gemini-2.5-flash generateContent API
- System prompt: "Thai customs expert, answer from context only"

**New DTOs:** `RagSearchRequest`, `RagSearchResponse`, `RagChunkDto`

**Phase 1 Verification:**
- Call `/v1/customsguard/hs-codes` ไม่มี token → 401
- Call ด้วย Bearer token → 200
- `POST /scan` with PDF → 202 + jobId, PDF อยู่ใน S3
- `POST /hs/lookup` → response พร้อม FTA alerts
- `POST /rag/search` → synthesized answer + sources

---

## Phase 2: Extension Migration

### 2.1 Backend API Client
**New:** `chrome-extension/cgai/src/lib/api-client.ts`
- Class `ApiClient` จัดการ baseUrl + JWT token
- Methods: `scanPdf()`, `getJobStatus()`, `hsLookup()`, `ragSearch()`, `semanticSearch()`
- เก็บ config ใน `chrome.storage.local`

### 2.2 Replace ai-proxy.ts
**File:** `src/background/ai-proxy.ts`
- ลบ Gemini direct call ทั้งหมด
- แทนด้วย: `extractViaBackend()` + `pollScanResult()` ที่ใช้ api-client

### 2.3 Update background/index.ts
**File:** `src/background/index.ts`
- เพิ่ม message types: `SET_AUTH`, `FTA_LOOKUP`, `RAG_SEARCH`
- แก้ `SCAN_PDF` handler ให้ส่ง PDF ไป backend แทน Gemini

### 2.4 Update manifest.json
**File:** `manifest.json`
- ลบ `https://generativelanguage.googleapis.com/*`
- เพิ่ม backend API URL

### 2.5 Settings — JWT Login แทน API Key
**File:** `src/sidepanel/components/SettingsDialog.tsx`
- เปลี่ยนจาก Gemini API key form เป็น Backend login form (URL + email + password)
- Store JWT ใน chrome.storage.local

### 2.6 ScanPanel — ใช้ Backend API
**File:** `src/sidepanel/components/ScanPanel.tsx`
- ส่ง raw PDF ไป backend (ไม่ต้อง render เป็น image ก่อน)
- Poll job status จนเสร็จ
- หลัง scan เสร็จ → auto call `hsLookup()` เพื่อ enrich ด้วย FTA data

### 2.7 FTA Alert Banner
**New:** `src/sidepanel/components/FtaAlertBanner.tsx`
- แสดง FTA savings opportunities
- ข้อมูล: FTA name, preferential rate, saving %, conditions

### 2.8 Chat/RAG Panel
**New:** `src/sidepanel/components/ChatPanel.tsx`
- Chat UI สำหรับถามเรื่อง HS Code / กฎหมายศุลกากร
- ใช้ `apiClient.ragSearch()`
- แสดง answer + source citations

### 2.9 Updated Traffic Light
**File:** `src/types/index.ts`
- เพิ่มสี `gold` — แสดงเมื่อมี FTA savings

**File:** `src/sidepanel/components/TrafficLight.tsx`
- เพิ่ม gold ใน COLOR_MAP

### 2.10 App.tsx — เพิ่ม Tab + Connection Status
**File:** `src/sidepanel/App.tsx`
- เพิ่ม tab "Chat" สำหรับ RAG search
- แสดง backend connection status

### 2.11 Offline-First Cache
**File:** `src/lib/db.ts`
- Dexie v3: เพิ่ม `cgFtaCache`, `cgRagCache` tables
- Cache FTA lookup + RAG results สำหรับ offline use

### 2.12 Update useScanItems Hook
**File:** `src/sidepanel/hooks/useScanItems.ts`
- หลัง save extracted items → auto FTA lookup
- Store FTA results ใน cache

**Phase 2 Verification:**
- Extension Settings → login ด้วย backend credentials → JWT stored
- Drop PDF → scan ผ่าน backend → items appear
- FTA alert banners แสดงสำหรับ HS codes ที่มี savings
- Gold traffic light สำหรับ items ที่มี FTA
- Chat tab → ถาม → ได้คำตอบ + citations
- Network tab → ไม่มี request ไป `generativelanguage.googleapis.com`
- `manifest.json` ไม่มี Google API ใน host_permissions

---

## Summary: Files ที่ต้องสร้าง/แก้

### New Files (20)
| # | File | Phase |
|---|------|-------|
| 1 | `V1002__hs_codes_global_refactor.sql` | 0 |
| 2 | `V1003__knowledge_base_tables.sql` | 0 |
| 3 | `FtaRateEntity.java` | 0 |
| 4 | `RegulationEntity.java` | 0 |
| 5 | `DocumentChunkEntity.java` | 0 |
| 6 | `FtaRateRepository.java` | 0 |
| 7 | `DocumentChunkRepository.java` | 0 |
| 8 | `JwtAuthenticationFilter.java` | 1 |
| 9 | `S3StorageService.java` | 1 |
| 10 | `ScanController.java` | 1 |
| 11 | `ScanService.java` | 1 |
| 12 | `HsLookupController.java` | 1 |
| 13 | `HsLookupService.java` | 1 |
| 14 | `RagController.java` | 1 |
| 15 | `RagService.java` | 1 |
| 16 | `GeminiChatService.java` | 1 |
| 17 | DTOs (ScanJobResponse, HsLookup*, FtaAlertDto, RagSearch*, RagChunkDto) | 1 |
| 18 | `api-client.ts` | 2 |
| 19 | `FtaAlertBanner.tsx` | 2 |
| 20 | `ChatPanel.tsx` | 2 |

### Modified Files (15)
| # | File | Phase |
|---|------|-------|
| 1 | `docker-compose.yml` | 0 |
| 2 | `application.yml` | 0 |
| 3 | `HsCodeEntity.java` | 0 |
| 4 | `HsCodeRepository.java` | 0 |
| 5 | `HsCodeService.java` | 0 |
| 6 | `HsCodeController.java` | 0 |
| 7 | `HsCodeResponse.java` + `SemanticSearchResponse.java` | 0 |
| 8 | `SecurityConfig.java` | 1 |
| 9 | `feature-customsguard/build.gradle.kts` | 1 |
| 10 | `ai-proxy.ts` | 2 |
| 11 | `background/index.ts` | 2 |
| 12 | `manifest.json` | 2 |
| 13 | `types/index.ts` + `TrafficLight.tsx` | 2 |
| 14 | `ScanPanel.tsx` + `SettingsDialog.tsx` + `App.tsx` | 2 |
| 15 | `db.ts` + `useScanItems.ts` | 2 |

---

## Improvements (Post-Review)

### Red Flag #1: Rate Limiting + PDF Validation
**File:** `ScanService.java`
- PDF magic bytes validation (%PDF header check) ก่อน upload S3
- Rate limit: max 5 concurrent active jobs per tenant (query ai_jobs count)
- ScanController returns 429 Too Many Requests เมื่อเกิน limit
- ScanController returns 400 Bad Request สำหรับ invalid PDF

### Red Flag #2: Offline Cache Expiration
**File:** `api-client.ts`
- `isCacheValid(cachedAt, ttlMs)` utility function
- FTA cache TTL: 24 hours (อัตราอากรเปลี่ยนไม่บ่อย)
- RAG cache TTL: 12 hours (knowledge base อาจ update)

### Improvement #1: Hybrid Search (RRF)
**File:** `HsCodeRepository.java`
- `hybridSearch()` method ใช้ Reciprocal Rank Fusion (RRF)
- รวม Full-Text Search (ts_rank) + Vector Similarity (pgvector cosine)
- ใช้ CTE: `fts` (FTS ranks) FULL OUTER JOIN `sem` (semantic ranks)
- RRF formula: `1/(60+fts_rank) + 1/(60+sem_rank)`
- แม่นกว่า FTS หรือ Semantic อย่างเดียว

### Improvement #2: SSE Streaming for RAG
**Files:** `RagController.java`, `RagService.java`, `api-client.ts`
- `POST /v1/customsguard/rag/stream` — SSE endpoint
- Events flow: `status` → `sources` → `status` → `done`
- ใช้ Virtual Thread executor (ไม่ block servlet thread)
- Extension `ragSearchStream()` method parses SSE events
- ChatPanel สามารถแสดง sources ทันทีก่อนรอ LLM ตอบ

### Build Status
- Backend: `BUILD SUCCESSFUL`
- Extension: `tsc --noEmit` clean + `npm run build` clean
