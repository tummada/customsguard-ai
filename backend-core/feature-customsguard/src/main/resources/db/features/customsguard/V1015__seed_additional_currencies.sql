-- =============================================================
-- V1015: Seed additional exchange rates — SGD, HKD, AUD, CHF, CAD, NZD, TWD, MYR, IDR, INR, VND, PHP
-- อ้างอิง: customs.go.th ประจำวันที่ 10 มี.ค. 2569
-- อัตรานำเข้า (Import Rate) สำหรับคำนวณอากรศุลกากร
-- =============================================================

INSERT INTO cg_exchange_rates (id, currency_code, currency_name, mid_rate, effective_date, source, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'SGD', 'Singapore Dollar', 23.5200, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'HKD', 'Hong Kong Dollar', 4.0300, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'AUD', 'Australian Dollar', 20.0500, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CHF', 'Swiss Franc', 35.8400, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CAD', 'Canadian Dollar', 22.0100, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'NZD', 'New Zealand Dollar', 18.1200, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TWD', 'Taiwan Dollar', 0.9580, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MYR', 'Malaysian Ringgit', 7.1200, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'IDR', 'Indonesian Rupiah', 0.1920, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'INR', 'Indian Rupee', 0.3620, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'VND', 'Vietnamese Dong', 0.1230, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PHP', 'Philippine Peso', 0.5450, '2026-03-10', 'CUSTOMS_DEPT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (currency_code) DO UPDATE SET
    currency_name = EXCLUDED.currency_name,
    mid_rate = EXCLUDED.mid_rate,
    effective_date = EXCLUDED.effective_date,
    source = EXCLUDED.source,
    updated_at = CURRENT_TIMESTAMP;

-- Update V1011 seed regulation: mark De Minimis as repealed since Jan 1, 2026
UPDATE cg_regulations
SET body_text = REPLACE(
    body_text,
    'ยกเว้นอากรสำหรับสินค้ามูลค่าไม่เกิน 1,500 บาท',
    'ยกเว้นอากรสำหรับสินค้ามูลค่าไม่เกิน 1,500 บาท [ยกเลิกแล้ว ตั้งแต่ 1 ม.ค. 2569 — สินค้าทุกรายการต้องเสียอากร+VAT ตั้งแต่ 1 บาท]'
),
    updated_at = CURRENT_TIMESTAMP
WHERE body_text LIKE '%ยกเว้นอากรสำหรับสินค้ามูลค่าไม่เกิน 1,500 บาท%'
  AND body_text NOT LIKE '%ยกเลิกแล้ว%';
