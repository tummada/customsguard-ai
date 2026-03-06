-- =============================================================
-- V1012: Add tenant_id + RLS to Tier 2 supplementary tables
-- Tables created in V1006 without multi-tenancy support
-- Also add updated_at trigger for automatic timestamping
-- =============================================================

-- ── Helper: updated_at trigger function (reusable) ──────────
CREATE OR REPLACE FUNCTION cg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 1. cg_ad_duties — Anti-Dumping / Countervailing Duties
-- =============================================================
ALTER TABLE cg_ad_duties
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE cg_ad_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_ad_duties FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_ad_duties AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE INDEX idx_cg_ad_tenant ON cg_ad_duties (tenant_id);

CREATE TRIGGER trg_cg_ad_duties_updated_at
    BEFORE UPDATE ON cg_ad_duties
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

-- =============================================================
-- 2. cg_excise_rates — Excise Tax
-- =============================================================
ALTER TABLE cg_excise_rates
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE cg_excise_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_excise_rates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_excise_rates AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE INDEX idx_cg_excise_tenant ON cg_excise_rates (tenant_id);

CREATE TRIGGER trg_cg_excise_rates_updated_at
    BEFORE UPDATE ON cg_excise_rates
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

-- =============================================================
-- 3. cg_boi_privileges — BOI Privileges
-- =============================================================
ALTER TABLE cg_boi_privileges
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE cg_boi_privileges ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_boi_privileges FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_boi_privileges AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE INDEX idx_cg_boi_tenant ON cg_boi_privileges (tenant_id);

CREATE TRIGGER trg_cg_boi_privileges_updated_at
    BEFORE UPDATE ON cg_boi_privileges
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

-- =============================================================
-- 4. cg_lpi_controls — LPI Controls (Import Licenses)
-- =============================================================
ALTER TABLE cg_lpi_controls
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE cg_lpi_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_lpi_controls FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_lpi_controls AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE INDEX idx_cg_lpi_tenant ON cg_lpi_controls (tenant_id);

CREATE TRIGGER trg_cg_lpi_controls_updated_at
    BEFORE UPDATE ON cg_lpi_controls
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

-- =============================================================
-- 5. cg_exchange_rates — Exchange Rates (from V1009)
-- =============================================================
ALTER TABLE cg_exchange_rates
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE cg_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_exchange_rates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_exchange_rates AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE INDEX idx_cg_exrate_tenant ON cg_exchange_rates (tenant_id);

CREATE TRIGGER trg_cg_exchange_rates_updated_at
    BEFORE UPDATE ON cg_exchange_rates
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

-- =============================================================
-- 6. Also add triggers to V1003 tables (cg_fta_rates, cg_regulations)
-- =============================================================
CREATE TRIGGER trg_cg_fta_rates_updated_at
    BEFORE UPDATE ON cg_fta_rates
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();

CREATE TRIGGER trg_cg_regulations_updated_at
    BEFORE UPDATE ON cg_regulations
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();
