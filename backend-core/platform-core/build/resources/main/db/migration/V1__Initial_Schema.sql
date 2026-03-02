-- =============================================================
-- AI-SaaS World-Class: Initial Schema (V1)
-- Goal: 100% Data Integrity, RLS Hardening, and Outbox Pattern
-- =============================================================

-- 1. Core Structure
CREATE TABLE tenants (
    id UUID PRIMARY KEY, -- Application-generated UUID v7
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'FREE', 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_balances (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    balance BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    amount INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- TOPUP, RESERVE, CONFIRM, REFUND
    reference_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ledger_tenant_time ON credit_ledger(tenant_id, created_at DESC);

CREATE TABLE ai_jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    status VARCHAR(50) DEFAULT 'CREATED', 
    progress SMALLINT DEFAULT 0, -- Optimized 2-bytes
    model_type VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    output_urls JSONB,
    aspect_ratio VARCHAR(20), 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_active_jobs ON ai_jobs (tenant_id) WHERE status NOT IN ('COMPLETED', 'FAILED');

-- Transactional Outbox: ประกันการส่งงานไป n8n/Email/Stripe
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ -- NULL = Waiting to be sent
);
CREATE INDEX idx_outbox_unprocessed ON outbox_events(created_at) WHERE processed_at IS NULL;

-- =============================================================
-- 🛠️ 2. AUTOMATION: Triggers (The Engine)
-- =============================================================

-- [FIXED] สร้างแถว Balance ทันทีที่มี Tenant ใหม่ (ด่านแรก)
CREATE OR REPLACE FUNCTION init_tenant_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_balances (tenant_id, balance) VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_balance
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION init_tenant_balance();

-- Sync Ledger to Balance (ด่านสอง)
CREATE OR REPLACE FUNCTION sync_tenant_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tenant_balances
    SET balance = balance + NEW.amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = NEW.tenant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_balance
AFTER INSERT ON credit_ledger
FOR EACH ROW EXECUTE FUNCTION sync_tenant_balance();

-- =============================================================
-- 🛡️ 3. SECURITY: Row-Level Security (RLS Hardening)
-- =============================================================

-- เปิดใช้งาน RLS และ Force ให้มีผลแม้กับ Owner
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE ai_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;

-- ใช้ SET LOCAL app.current_tenant_id ภายใน Transaction
CREATE POLICY tenant_isolation_policy ON ai_jobs AS PERMISSIVE
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON credit_ledger AS PERMISSIVE
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON tenant_balances AS PERMISSIVE
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON outbox_events AS PERMISSIVE
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);