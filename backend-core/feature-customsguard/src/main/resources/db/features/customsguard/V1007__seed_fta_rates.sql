-- =============================================================
-- V1007: Seed FTA Rate Data for Dev/Testing
-- Provides clear rate differentials for Traffic Light demo
-- =============================================================

-- First ensure the HS codes exist (some may not be seeded yet)
INSERT INTO cg_hs_codes (code, description_th, description_en, base_rate, unit, category, embedded)
VALUES
    ('1006.30', 'ข้าวขาว', 'Semi-milled or wholly milled rice', 30.00, 'KG', 'Cereals', false),
    ('8471.30', 'คอมพิวเตอร์แบบพกพา', 'Portable digital computers', 0.00, 'EA', 'Machinery', false),
    ('0306.17', 'กุ้งแช่แข็ง', 'Frozen shrimps and prawns', 5.00, 'KG', 'Seafood', false),
    ('4011.10', 'ยางรถยนต์นั่ง', 'New pneumatic tyres of rubber for motor cars', 10.00, 'EA', 'Rubber', false),
    ('0207.14', 'เนื้อไก่แช่แข็ง', 'Frozen cuts and offal of chickens', 40.00, 'KG', 'Meat', false),
    ('8517.12', 'โทรศัพท์มือถือ', 'Smartphones', 0.00, 'EA', 'Electronics', false)
ON CONFLICT (code) DO NOTHING;

-- Seed FTA rates with clear savings
-- Rice: base 30% → ATIGA 0% (saving 30%)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '1006.30', 'ATIGA', 'VN', 0.00, 'Form D', 'RVC >= 40% or CTH', '2020-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;

-- Computer: base 0% → JTEPA 0% (no saving, but shows FTA info)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '8471.30', 'JTEPA', 'JP', 0.00, 'Form JTEPA', 'CO Form JTEPA required', '2020-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;

-- Frozen shrimp: base 5% → ACFTA 0% (saving 5%)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '0306.17', 'ACFTA', 'CN', 0.00, 'Form E', 'China origin rule', '2020-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;

-- Tyres: base 10% → TAFTA 0% (saving 10%)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '4011.10', 'TAFTA', 'AU', 0.00, 'Form AAT', NULL, '2020-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;

-- Chicken: base 40% → ACFTA 24% (saving 16%)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '0207.14', 'ACFTA', 'CN', 24.00, 'Form E', 'WO or RVC >= 40%', '2020-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;

-- Smartphone: base 0% → RCEP 0% (already free)
INSERT INTO cg_fta_rates (id, hs_code, fta_name, partner_country, preferential_rate, form_type, conditions, effective_from)
VALUES (gen_random_uuid(), '8517.12', 'RCEP', 'KR', 0.00, 'Form RCEP', 'RCEP Rules of Origin', '2022-01-01')
ON CONFLICT (hs_code, fta_name, partner_country, effective_from) DO NOTHING;
