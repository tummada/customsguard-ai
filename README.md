# CustomsGuard AI

AI-powered customs declaration assistant for Thai import/export businesses — automates HS Code classification, duty calculation, and declaration form generation.

> Thai customs clerks spend 3-5 hours per declaration manually looking up HS Codes. One wrong classification = $3,000+ penalty. CustomsGuard cuts prep time by ~70%.

---

## What It Does

- **HS Code Classification** — AI classifies goods automatically from product descriptions
- **Duty Calculation** — calculates import/export duties including surcharges and FTA rates
- **Declaration Generation** — pre-fills customs declaration forms ready for submission
- **Chrome Extension** — works directly inside the Thai customs e-filing system
- **Multi-tenant** — strict data isolation between companies at the database level

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21 + Spring Boot 3.5 (GraalVM Native Image) |
| Frontend | Angular 21 (Zoneless + Signals) |
| Chrome Extension | React 19 + Vite |
| AI Pipeline | Python + RAG + n8n |
| Database | PostgreSQL 16 + Row Level Security |
| Infrastructure | Docker Compose + Caddy + Cloudflare |
| CI/CD | GitLab CI → VPS auto-deploy |

---

## Architecture

```
customsguard-ai/
├── backend-core/        # Java Spring Boot API (GraalVM Native)
├── chrome-extension/    # React Chrome Extension for customs filing
├── data-pipeline/       # Python RAG pipeline for HS Code classification
├── frontend-app/        # Angular 21 web dashboard
├── marketing-site/      # Landing page
└── docker-compose.yml   # Full stack orchestration
```

---

## Key Features

- **Multi-tenant SaaS** — each company's data fully isolated via PostgreSQL RLS
- **GraalVM Native** — Spring Boot compiles to native binary, ~70% less RAM
- **Async AI Pipeline** — n8n orchestrates classification jobs without blocking API
- **Idempotency** — all payment and credit APIs are safe to retry
- **Security hardened** — Semgrep + Gitleaks + OWASP scanned, secrets via env vars only

---

## Local Development

```bash
# Copy environment config
cp .env.example .env

# Start all services
docker compose up -d

# Verify
# Frontend: http://localhost:80
# API Docs: http://localhost:8080/swagger-ui
```

> Requires: Docker, Java 21, Node.js 22+
