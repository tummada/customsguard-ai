-- =============================================================
-- Feature Subscription System
-- Allows tenants to subscribe to vertical feature modules
-- =============================================================

-- Feature catalog (populated by application or migrations)
CREATE TABLE platform_features (
    feature_id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-Feature subscription junction table
CREATE TABLE tenant_features (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_id VARCHAR(50) NOT NULL REFERENCES platform_features(feature_id),
    active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_feature UNIQUE (tenant_id, feature_id)
);

CREATE INDEX idx_tf_tenant_active ON tenant_features(tenant_id) WHERE active = true;

-- RLS for tenant_features (same pattern as V1)
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_features FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON tenant_features AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
