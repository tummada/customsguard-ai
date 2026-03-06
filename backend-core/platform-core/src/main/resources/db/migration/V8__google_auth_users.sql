-- =============================================================
-- V8: Google OAuth Users + Subscription System
-- Enables Google login, auto-create tenant, usage tracking
-- =============================================================

-- 1. Users table (no RLS — auth lookup happens before tenant context)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    google_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- 2. Subscription plans (system table, no RLS)
CREATE TABLE subscription_plans (
    id VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    scan_limit INT NOT NULL,
    chat_limit INT NOT NULL,
    price_thb INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (id, display_name, scan_limit, chat_limit, price_thb)
VALUES
    ('FREE', 'Free', 10, 3, 0),
    ('PRO', 'Professional', 100, 100, 990);

-- 3. Tenant subscriptions (which plan each tenant is on)
CREATE TABLE tenant_subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    plan_id VARCHAR(20) NOT NULL REFERENCES subscription_plans(id),
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- No RLS: checked during auth flow before tenant context is set
CREATE INDEX idx_tenant_sub_tenant ON tenant_subscriptions(tenant_id);

-- 4. Tenant usage (monthly counters)
CREATE TABLE tenant_usage (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    scan_count INT NOT NULL DEFAULT 0,
    chat_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_usage_period UNIQUE (tenant_id, period)
);

CREATE INDEX idx_tenant_usage_lookup ON tenant_usage(tenant_id, period);

-- RLS on tenant_usage (accessed during requests when tenant context is set)
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON tenant_usage AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 5. Give dev tenant a FREE subscription
INSERT INTO tenant_subscriptions (id, tenant_id, plan_id)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'FREE'
WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id) DO NOTHING;
