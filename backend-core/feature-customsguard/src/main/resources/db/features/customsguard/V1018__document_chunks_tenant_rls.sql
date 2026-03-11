-- =============================================================
-- V1018: Add tenant_id + RLS to cg_document_chunks
-- Previously created in V1003 as global table without tenancy.
-- This is a CRITICAL security fix — without this, all tenants
-- can see all RAG document chunks (data leak).
-- =============================================================

-- 1. Add tenant_id column with default from app.current_tenant_id
--    For existing rows, use a placeholder tenant ID (will be backfilled below).
--
-- NOTE: Existing rows get nil UUID (00000000-...) which won't match any real tenant.
-- After RLS is enabled, those rows become invisible. To reassign them, run:
--   UPDATE cg_document_chunks SET tenant_id = '<real_tenant_id>'
--     WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
-- Or re-run the chunk-and-embed pipeline which inserts with the correct tenant_id.
ALTER TABLE cg_document_chunks
    ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000';

-- 2. Enable RLS
ALTER TABLE cg_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cg_document_chunks FORCE ROW LEVEL SECURITY;

-- 3. Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON cg_document_chunks AS PERMISSIVE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 4. Index on tenant_id for query performance
CREATE INDEX idx_cg_chunks_tenant ON cg_document_chunks (tenant_id);

-- 5. Add updated_at trigger (consistent with V1012 pattern)
CREATE TRIGGER trg_cg_document_chunks_updated_at
    BEFORE UPDATE ON cg_document_chunks
    FOR EACH ROW EXECUTE FUNCTION cg_set_updated_at();
