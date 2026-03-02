-- =============================================================
-- CustomsGuard Feature: Initial Schema (V1000)
-- Tables prefixed with cg_ to avoid naming collisions
-- =============================================================

-- Register feature in the catalog
INSERT INTO platform_features (feature_id, display_name, description)
VALUES ('customsguard', 'CustomsGuard - HS Code Management',
        'AI-powered customs declaration and HS code classification');

-- HS Code reference + tenant-specific data
CREATE TABLE cg_hs_codes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(12) NOT NULL,
    description_th TEXT,
    description_en TEXT,
    duty_rate NUMERIC(5,2),
    category VARCHAR(100),
    ai_confidence SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_hs_tenant_code ON cg_hs_codes(tenant_id, code);

ALTER TABLE cg_hs_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_hs_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_hs_codes AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Customs declarations
CREATE TABLE cg_declarations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    declaration_number VARCHAR(50),
    declaration_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT',
    items JSONB NOT NULL DEFAULT '[]',
    total_duty NUMERIC(12,2) DEFAULT 0,
    ai_job_id UUID REFERENCES ai_jobs(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_decl_tenant ON cg_declarations(tenant_id);
CREATE INDEX idx_cg_decl_active ON cg_declarations(tenant_id) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

ALTER TABLE cg_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_declarations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON cg_declarations AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
