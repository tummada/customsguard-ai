-- Migration: Create Marketing Leads Table with Strict Multi-Tenancy (RLS) v2
-- Goal: support Next.js 15 marketing site lead capture

-- 1. Create table with UUID v7 PK
CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID PRIMARY KEY, 
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT mkt_leads_tenant_check CHECK (tenant_id IS NOT NULL)
);

-- 2. Index for tenant-based lookup and email unique constraint per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_mkt_leads_tenant_email ON marketing_leads (tenant_id, email);

-- 3. Enable Row Level Security
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy
-- Assumes 'app.current_tenant_id' is set during the transaction (SET LOCAL)
DROP POLICY IF EXISTS leads_isolation_policy ON marketing_leads;
CREATE POLICY leads_isolation_policy ON marketing_leads
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 5. Force RLS
ALTER TABLE marketing_leads FORCE ROW LEVEL SECURITY;
