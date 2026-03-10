-- =============================================================
-- V1013: Fix exchange rates — ใช้อัตรานำเข้าจากกรมศุลกากร
-- ข้อมูลเดิมผิด (USD ผิด 9%, JPY ผิด 10%)
-- อ้างอิง: customs.go.th ประจำวันที่ 10 มี.ค. 2569
-- =============================================================

-- Fix USD: 34.10 → 31.3303 (อัตรานำเข้า กรมศุลกากร)
UPDATE cg_exchange_rates
SET mid_rate = 31.3303,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'USD';

-- Fix EUR: 36.85 → 37.2091
UPDATE cg_exchange_rates
SET mid_rate = 37.2091,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'EUR';

-- Fix JPY: 22.65 → 20.6166 (per 100 Yen)
UPDATE cg_exchange_rates
SET mid_rate = 20.6166,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'JPY';

-- Fix GBP: 42.90 → 42.7356
UPDATE cg_exchange_rates
SET mid_rate = 42.7356,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'GBP';

-- Fix CNY: 4.73 → 4.5963 (cross-rate estimate, will be corrected by auto-sync)
UPDATE cg_exchange_rates
SET mid_rate = 4.5963,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'CNY';

-- Fix KRW: 2.35 → 2.1600 (per 100 Won, cross-rate estimate)
UPDATE cg_exchange_rates
SET mid_rate = 2.1600,
    effective_date = '2026-03-10',
    source = 'CUSTOMS_DEPT',
    updated_at = CURRENT_TIMESTAMP
WHERE currency_code = 'KRW';
