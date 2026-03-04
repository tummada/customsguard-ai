# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VOLLOS is a multi-tenant SaaS platform (AI-SaaS) built as a **modular monolith** with Spring Boot 3.5 + Java 21. The primary feature module is **CustomsGuard** — AI-powered customs declaration and HS code classification using RAG (pgvector semantic search + Gemini embeddings). A Chrome Extension (React 19) provides the user-facing interface.

Target deployment: Docker Compose on 2 CPU / 8 GB RAM.

## Build & Run Commands

### Backend (from `backend-core/`)

```bash
# Start dev infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d

# Run backend in dev mode
./gradlew :platform-app:bootRun

# Build all modules
./gradlew build

# Build GraalVM native image
./gradlew :platform-app:nativeCompile

# Clean
./gradlew clean
```

Backend runs at `http://localhost:8080`. No tests exist yet.

### Chrome Extension (from `chrome-extension/cgai/`)

```bash
npm install
npm run dev      # Vite watch mode
npm run build    # Production build → dist/
```

Load in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → select `dist/`.

## Architecture

### Module Structure

```
backend-core/
├── platform-core/         # Shared: multi-tenancy, security, Flyway, base entities
├── platform-app/          # Bootable app entry point (depends on platform-core)
└── feature-customsguard/  # Pluggable feature (runtimeOnly dependency in platform-app)
```

**Dependency chain:** `platform-app` → `platform-core` ← `feature-customsguard`

Feature modules are discovered via Spring Boot auto-configuration (`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`). Each feature implements `FeatureDefinition` interface and is collected by `FeatureRegistry`.

### Feature Module Pattern (how to add a new feature)

1. Create a new Gradle submodule with `api(project(":platform-core"))` dependency
2. Implement `FeatureDefinition` interface (`getFeatureId()`, `getMigrationLocation()`, `getApiPrefix()`, etc.)
3. Create `@AutoConfiguration` class with `@ComponentScan`, `@EntityScan`, `@EnableJpaRepositories`
4. Register in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
5. Add `runtimeOnly(project(":feature-xxx"))` to `platform-app/build.gradle.kts`
6. Place migrations in `src/main/resources/db/features/{feature-name}/V{number}__description.sql`

### Multi-Tenancy

Every request must include `X-Tenant-ID` header (UUID). The flow:
1. `TenantInterceptor` extracts header → stores in `TenantContext` (ThreadLocal)
2. `TenantConnectionInterceptor` calls `set_config('app.current_tenant_id', ...)` on the JDBC connection
3. PostgreSQL RLS policies automatically filter all tenant-owned tables

Dev tenant ID: `a0000000-0000-0000-0000-000000000001`

### Flyway Migrations

Migrations auto-run on startup. `FlywayFeatureConfig` dynamically merges migration locations from all registered features.

- **Core migrations:** `platform-core/src/main/resources/db/migration/V{1-N}__*.sql`
- **Feature migrations:** `feature-{name}/src/main/resources/db/features/{name}/V{1000+}__*.sql`

Feature migration versions start at V1000+ to avoid conflicts with core.

### Database Conventions

- All tenant-owned tables have `tenant_id UUID NOT NULL` with RLS policies
- Entity table prefix per feature: `cg_*` (CustomsGuard)
- Timestamps: `created_at`, `updated_at` (TIMESTAMPTZ)
- Primary keys: UUID

### API Convention

Endpoints follow: `/v1/{feature-id}/{resource}/{operation}`

CustomsGuard endpoints:
- `GET /v1/customsguard/hs-codes` — list HS codes
- `POST /v1/customsguard/hs-codes/semantic` — vector similarity search
- `POST /v1/customsguard/hs-codes/embed-all` — re-embed all codes
- `POST /v1/customsguard/hs-codes/seed` — seed sample data
- `POST /v1/customsguard/hs/lookup` — batch lookup with FTA rates
- `POST /v1/customsguard/scan` — upload PDF for scanning
- `GET /v1/customsguard/scan/{jobId}` — poll scan job status
- `POST /v1/customsguard/rag/search` — RAG search
- `POST /v1/customsguard/rag/stream` — RAG search (SSE)

### RAG / Embedding

- Uses Google Gemini `text-embedding-004` (768 dimensions) via direct HTTP calls (no spring-ai)
- API URL uses `v1beta` (not `v1`)
- pgvector stores embeddings; HNSW index for cosine similarity search
- Vector values passed as String `"[0.01,0.02,...]"` cast to `vector` in SQL (no Hibernate custom type)

### Key Configuration

`application.yml` in `platform-app/src/main/resources/`:
- `spring.jpa.hibernate.ddl-auto: validate` — schema managed by Flyway only
- `spring.threads.virtual.enabled: true` — virtual threads enabled
- `spring.flyway.baseline-on-migrate: true`
- SecurityConfig: `permitAll` for dev (no auth)

### Docker

- `docker-compose.yml` — full production stack (postgres, redis, backend, n8n, nginx, marketing)
- `docker-compose.dev.yml` — dev only (postgres + redis)
- PostgreSQL image: `pgvector/pgvector:pg16` (includes pgvector extension)
- `init-db.sh` creates n8n database and enables pgvector extension

## RAG Development Roadmap (README5.md)

- **Phase 1: DONE** — pgvector + HS Code semantic search
- **Phase 2: TODO** — Document RAG (regulations + case law)
- **Phase 3: TODO** — Chrome Extension integration with RAG backend

---

## Architecture Commandments (กฎเหล็ก)

กฎที่ต้องปฏิบัติตามเสมอ — มาจาก Team Manifesto:

1. **Silence is Veto** — ถ้าไม่แน่ใจว่าการเปลี่ยนแปลงจะกระทบ resource/security → ให้ถามก่อน ห้ามเดา
2. **No Yes-Man** — ถ้าคำสั่งผู้ใช้เสี่ยงต่อเครื่อง 8GB หรือ security → ต้อง "ขัด" และเสนอทางเลือกที่ Lean กว่า
3. **Sequential Write Rule** — ห้ามใช้ `GenerationType.AUTO` → ต้องสร้าง UUID v7 จาก Application Layer เสมอ
4. **Audit-Ready** — ทุก destructive action ต้อง log, ทุก query ต้องผ่าน RLS (`tenant_id`)
5. **The 1.9 Rule** — Docker CPU quota รวมต้อง ≤ 1.9 cores (เหลือ 0.1 ให้ Host OS)
6. **Binary-Free** — ห้ามเก็บ binary ใน container filesystem → ใช้ S3/MinIO เท่านั้น
7. **Shadow Build** — ห้าม build GraalVM native image บน production (ใช้ CI/CD)

---

## Available Skills (summary only — read SKILL.md for details)

- `/vollos-api-test <endpoint>` — Stateful API tester with token cache, auto-retry, skeleton response. For details: `.claude/skills/vollos-api-test/SKILL.md`
- `/check-table <name>` — Show table schema with smart validation (auto-lists tables if no arg). For details: `~/.claude/skills/check-table/SKILL.md`
- `/db-health` — Full system health report (DB + API + migrations). For details: `.claude/skills/db-health/SKILL.md`
- `/hello` — Senior Dev personality greeting. For details: `~/.claude/skills/hello/SKILL.md`
- `/review-db <file>` — ตรวจ SQL migration/schema ตามมาตรฐาน (RLS, UUID v7, index quota). For details: `.claude/skills/review-db/SKILL.md`
- `/review-java <file>` — ตรวจ Java code ตามมาตรฐาน (Virtual Threads, HikariCP, GraalVM). For details: `.claude/skills/review-java/SKILL.md`
- `/security-audit <scope>` — ตรวจ security (JWT, RLS, PII, S3, CORS, rate limiting). For details: `.claude/skills/security-audit/SKILL.md`
- `/review-infra <file>` — ตรวจ Docker/resource config ตามข้อจำกัด 2CPU/8GB. For details: `.claude/skills/review-infra/SKILL.md`

## MCP Servers Available

- **vollos-db:** PostgreSQL database via dbhub (project scope, `.mcp.json`)
  - ALWAYS use `LIMIT 10` by default for queries that may return many rows
  - PREFER using MCP query over asking the user for data that can be looked up
  - NEVER run DROP, DELETE, or TRUNCATE without explicit user confirmation

## Workflow Hints

- เมื่อผู้ใช้ถามเรื่อง database / records / data → ALWAYS use MCP `vollos-db` query ได้เลย ไม่ต้องถาม
- เมื่อผู้ใช้ต้องการทดสอบ API → use skill `/vollos-api-test`
- เมื่อผู้ใช้ถามเรื่อง table structure / schema / columns → use skill `/check-table`
- เมื่อเห็นคำว่า "สุขภาพระบบ", "health check", "ตรวจ DB" → use skill `/db-health`
- เมื่อ query ซับซ้อน (JOIN, subquery, aggregation) → แสดง SQL ก่อนรัน แล้วถามยืนยัน

## Think Before You Act

Before executing any multi-step operation (MCP query + API call + file write),
ALWAYS show a brief execution plan first:

```
Execution Plan:
Step 1: [action] → expected result
Step 2: [action] → expected result
...
ดำเนินการเลยไหม?
```

This applies to:
- `/db-health` — show all planned queries before executing
- Complex database operations involving multiple tables
- Any operation that modifies data (INSERT, UPDATE)
- Multi-API-call sequences

For simple read-only queries (single SELECT), execute immediately without a plan.

## Emergency Stops

ถ้าเกิดปัญหาที่ควบคุมไม่ได้ ให้รันคำสั่งเหล่านี้ทันที:
- หยุด MCP ทั้งหมด: `pkill -f mcp` หรือ `pkill -f dbhub`
- หยุด dev infrastructure: `docker compose -f docker-compose.dev.yml down`
- หยุด backend: `pkill -f gradlew` หรือ `pkill -f java`
- ล้าง cached token: `rm -f /tmp/vollos-dev-token`
