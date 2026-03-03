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
