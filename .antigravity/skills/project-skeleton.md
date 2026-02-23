# 🏗️ AI-SaaS World-Class: Project Skeleton (v1.2)

โครงสร้างโฟลเดอร์ที่ผ่านการ Sync กับ config.json และ Docker Service Name เรียบร้อยแล้ว

## 📂 1. Root Directory
- `docker-compose.yml` (Master Orchestration)
- `.env.example` (Environment Blueprint)
- `init-db.sh` (PostgreSQL Multi-DB Initialization)

## 📂 2. Documentation: `/docs`
- `openapi.yaml` (Source of Truth - API Contract) [FIXED PATH]

## 📂 3. Backend: `/backend-core` (Spring Boot 3.5 + Java 21)
- `src/main/java/com/saas/core/`
    - `config/`: Virtual Threads, Jackson Blackbird, Redis/Cache Config
    - `security/`: JWT RS256, TenantContextHolder, RLS Interceptor
    - `entity/`: Database Entities (UUID v7, RLS Annotations)
    - `repository/`: Spring Data JPA (Tenant Filtering enabled)
    - `service/`: Business Logic (Transactional Outbox Pattern)
    - `controller/`: REST APIs (Mapped to OpenAPI)
    - `shared/`: UUIDv7 Generators, Base Constants
    - `exception/`: Global Exception Handler
    - `dto/`: Request/Response Objects
- `src/main/resources/`
    - `db/migration/`: Flyway/Liquibase Scripts (RLS Setup included)
    - `META-INF/native-image/`: GraalVM Reflection/Proxy hints
- `Dockerfile`: Multi-stage (GraalVM Build -> Debian Slim Run)

## 📂 4. Frontend: `/frontend-app` (Angular 21 Zoneless)
- `src/app/`
    - `core/`: Signals-based Stores, HTTP Interceptors, Auth Guards
    - `shared/`: UI Components (Tailwind), Reusable Signals
    - `features/`: Module-based (Dashboard, AI-Gen, Billing)
    - `models/`: Interfaces & Types
- `src/assets/`: Static Assets & Styles
- `Dockerfile`: Nginx Alpine for Static Serving

## 📂 5. AI Workflow: `/ai-workflow`
- `workflows/`: n8n Workflow JSON Templates
- `backups/`: Daily workflow exports
- `custom-nodes/`: Specific logic for AI Integration

## 📂 7. Infrastructure: `/infra`
- `nginx/`: 
    - `conf.d/default.conf` (Uses 'backend:8080' upstream) [FIXED NAMING]
- `scripts/`: `backup.sh`, `deploy.sh`, `security-scan.sh`

## 📂 8. Marketing Site: `/marketing-site` (Node.js + Express)
- `src/`
    - `routes/`: Lead capture and landing page routing
    - `controllers/`: Lead processing logic
    - `middleware/`: Row Level Security (RLS) & Tenant filtering
    - `config/`: Database connections & Env settings
- `public/`: Static Assets (Luxury Brand Protocol)
- `views/`: EJS or Pug Templates
- `Dockerfile`: Node.js 20-Alpine configuration

## 📂 9. Antigravity Skills: `/.antigravity/skills`
- `team-manifesto.md`
- `database-design.md`
- `backend-java-spring.md`
- `frontend-angular-ui.md`
- `security-audit.md`
- `ai-orchestration.md`
- `project-skeleton.md`
- `marketing-landing-page.md`
- `logo-design.md`

---
"Alignment is the silent driver of project velocity."