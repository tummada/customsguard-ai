-- V1017: Add export_rate column to cg_exchange_rates (M-export-rate)
-- customs.go.th provides both export and import rates per currency
-- mid_rate = import rate (existing, unchanged)
-- export_rate = export rate (new)
ALTER TABLE cg_exchange_rates ADD COLUMN export_rate NUMERIC(10,4);
