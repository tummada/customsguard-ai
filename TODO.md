# TODO — VOLLOS Backlog

Shared backlog visible to all AI tools and humans.
Updated: 2026-03-05

## Deploy & CI/CD
- [ ] SHA-based deploy: แก้ docker-compose.prod.yml ใช้ `image:` จาก registry แทน `build:`

## ChatGuard
- [ ] Rate limit tuning: 5 → 20-30 req/min หรือเปลี่ยนเป็น per-user
- [ ] Rate limit config: ย้ายจาก hardcode ไป application.yml
- [ ] ChatGuard log format: เพิ่ม structured log เช่น `[ChatGuard] BLOCKED: PROMPT_INJECTION`

## RAG / Data Pipeline
- [ ] Phase 2: Document RAG (กฎระเบียบ + คดีความ)
- [ ] Phase 3: Chrome Extension integration with RAG backend
- [ ] enrichItemsWithRag flow in extension

## Content Marketing
- [ ] n8n workflows: blog-publisher, lead-nurture, sheets-review-sync, social-publisher, token-refresh
