-- =============================================================
-- V5: Dev Environment Seed Data
-- Seeds dev tenant, feature subscription, and disables RLS
-- on tenant_features (system lookup table)
-- =============================================================

-- 1. Register customsguard feature (idempotent)
INSERT INTO platform_features (feature_id, display_name, description)
VALUES ('customsguard', 'Customs Guard AI', 'AI customs declaration assistant')
ON CONFLICT (feature_id) DO NOTHING;

-- 2. Seed dev tenant
INSERT INTO tenants (id, name, plan_type)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Dev Tenant', 'PRO')
ON CONFLICT (id) DO NOTHING;

-- 3. Subscribe dev tenant to customsguard
INSERT INTO tenant_features (id, tenant_id, feature_id, active)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'customsguard', true)
ON CONFLICT (tenant_id, feature_id) DO NOTHING;

-- 4. Disable RLS on tenant_features (system lookup table)
-- FeatureAccessInterceptor queries this before tenant context is set on the connection,
-- and it already filters by tenant_id in the WHERE clause.
ALTER TABLE tenant_features DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_features;
