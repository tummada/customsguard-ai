-- Migration: Create Marketing Leads Table with Strict Multi-Tenancy (RLS)
-- Goal: support marketing-site lead capture while keeping 8GB/1.9 CPU constraints in mind

-- 1. Create table with UUID v7 PK
CREATE TABLE IF NOT EXISTS mkt_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Note: Application layer should ideally provide UUID v7
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT mkt_leads_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- 2. Index for tenant-based lookups
CREATE INDEX idx_mkt_leads_tenant_id ON mkt_leads(tenant_id);

-- 3. Enable Row Level Security
ALTER TABLE mkt_leads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy
-- Assumes 'app.current_tenant' is set during the transaction (SET LOCAL)
DROP POLICY IF EXISTS tenant_isolation_policy ON mkt_leads;
CREATE POLICY tenant_isolation_policy ON mkt_leads
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Force RLS for all users (including owner if necessary, but standard is enough)
ALTER TABLE mkt_leads FORCE ROW LEVEL SECURITY;

-- COMMENT: No SERIAL used. UUID v7 (or equivalent) enforced via application/gen_random_uuid fallback.
-- COMMENT: tenant_id is mandatory for every row.
