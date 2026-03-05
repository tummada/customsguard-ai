# Data Pipeline TODO

## สถานะปัจจุบัน (2026-03-06)

FTA rates inserted + deployed to production.

## สิ่งที่เสร็จแล้ว

- [x] Phase 1: Restore Dev DB + RAG Benchmark (hit rate 96.7%)
- [x] Phase 2: FTA scraper rewrite + run (13,754 rates)
- [x] Phase 3a: RagService availability masking (AD, excise, BOI, LPI)
- [x] Scripts: 15_rag_benchmark.py, 16_scrape_fta_playwright.py, 17_restore_prod.py, 18_validate_integrity.py
- [x] Insert FTA rates to Dev DB: 12,751 inserted (90 skipped, no FK match)
- [x] Validate data integrity: ALL CHECKS PASSED
- [x] Dump Dev DB: cg_dump_20260306_0527.sql.gz (69MB)
- [x] Deploy Production: 12,752 FTA rates restored to VPS
