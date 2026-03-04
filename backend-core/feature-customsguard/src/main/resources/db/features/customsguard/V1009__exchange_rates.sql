-- =============================================================
-- V1009: Exchange Rate table + seed data
-- อัตราแลกเปลี่ยนกรมศุลกากร (อ้างอิง BOT mid rate)
-- =============================================================

CREATE TABLE cg_exchange_rates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code   VARCHAR(3)  NOT NULL,
    currency_name   VARCHAR(100),
    mid_rate        NUMERIC(10,4) NOT NULL,
    effective_date  DATE        NOT NULL,
    source          VARCHAR(50) DEFAULT 'BOT',
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_exrate_currency ON cg_exchange_rates (currency_code);
CREATE INDEX idx_cg_exrate_effective ON cg_exchange_rates (effective_date DESC);
CREATE UNIQUE INDEX idx_cg_exrate_currency_date ON cg_exchange_rates (currency_code, effective_date);

-- Seed: อัตราแลกเปลี่ยนอ้างอิง ณ วันที่ 3 มี.ค. 2569
INSERT INTO cg_exchange_rates (id, currency_code, currency_name, mid_rate, effective_date, source)
VALUES
    (gen_random_uuid(), 'USD', 'US Dollar',         34.1000, '2026-03-03', 'BOT'),
    (gen_random_uuid(), 'EUR', 'Euro',              36.8500, '2026-03-03', 'BOT'),
    (gen_random_uuid(), 'JPY', 'Japanese Yen (100)',22.6500, '2026-03-03', 'BOT'),
    (gen_random_uuid(), 'CNY', 'Chinese Yuan',       4.7300, '2026-03-03', 'BOT'),
    (gen_random_uuid(), 'GBP', 'British Pound',     42.9000, '2026-03-03', 'BOT'),
    (gen_random_uuid(), 'KRW', 'Korean Won (100)',   2.3500, '2026-03-03', 'BOT');
