-- =============================================================
-- Phase 0: Refactor cg_hs_codes from per-tenant to global/shared
-- BREAKING CHANGE: drops existing cg_hs_codes data
-- HS Codes are public reference data — all tenants share the same set
-- =============================================================

-- 1. Drop RLS policies and old table
DROP POLICY IF EXISTS tenant_isolation_policy ON cg_hs_codes;
ALTER TABLE cg_hs_codes DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS cg_hs_codes CASCADE;

-- 2. Recreate as global shared table (no tenant_id, no RLS)
CREATE TABLE cg_hs_codes (
    code            VARCHAR(12)  PRIMARY KEY,
    section         SMALLINT,
    chapter         SMALLINT,
    heading         VARCHAR(6),
    subheading      VARCHAR(8),
    description_th  TEXT,
    description_en  TEXT,
    base_rate       NUMERIC(6,2),
    unit            VARCHAR(50),
    category        VARCHAR(100),
    embedding       vector(768),
    embedded        BOOLEAN      DEFAULT FALSE,
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cg_hs_chapter   ON cg_hs_codes (chapter);
CREATE INDEX idx_cg_hs_heading   ON cg_hs_codes (heading);
CREATE INDEX idx_cg_hs_fts       ON cg_hs_codes USING GIN (search_vector);

-- HNSW index (works for 768 dims, within 2000 limit)
CREATE INDEX idx_cg_hs_embedding ON cg_hs_codes
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Auto-update search_vector trigger
CREATE OR REPLACE FUNCTION cg_hs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.code, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_en, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_th, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cg_hs_fts
BEFORE INSERT OR UPDATE ON cg_hs_codes
FOR EACH ROW EXECUTE FUNCTION cg_hs_search_vector_update();
