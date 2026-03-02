-- =============================================================
-- Phase 0: Knowledge Base Tables (Global / Shared, NO RLS)
-- FTA Rates, Regulations, and Document Chunks for RAG
-- =============================================================

-- 1. FTA Rates: อัตราอากรพิเศษตาม FTA
CREATE TABLE cg_fta_rates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code             VARCHAR(12) NOT NULL REFERENCES cg_hs_codes(code),
    fta_name            VARCHAR(100) NOT NULL,
    partner_country     VARCHAR(3)  NOT NULL,
    preferential_rate   NUMERIC(6,2) NOT NULL,
    form_type           VARCHAR(15),
    conditions          TEXT,
    effective_from      DATE        NOT NULL,
    effective_to        DATE,
    source_url          TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_fta_hs         ON cg_fta_rates (hs_code);
CREATE INDEX idx_cg_fta_hs_country ON cg_fta_rates (hs_code, partner_country);
CREATE INDEX idx_cg_fta_name       ON cg_fta_rates (fta_name);
CREATE UNIQUE INDEX idx_cg_fta_unique ON cg_fta_rates (hs_code, fta_name, partner_country, effective_from);

-- 2. Regulations: ประกาศกรมศุลกากร, คำวินิจฉัย, กฎหมาย
CREATE TABLE cg_regulations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type            VARCHAR(30) NOT NULL,
    doc_number          VARCHAR(100),
    title               TEXT        NOT NULL,
    issuer              VARCHAR(100),
    issued_date         DATE,
    content             TEXT        NOT NULL,
    source_url          TEXT,
    effective_date      DATE,
    related_hs_codes    VARCHAR(12)[],
    tags                TEXT[],
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_reg_type     ON cg_regulations (doc_type);
CREATE INDEX idx_cg_reg_hs_codes ON cg_regulations USING GIN (related_hs_codes);

-- 3. Document Chunks: pgvector embeddings สำหรับ RAG
CREATE TABLE cg_document_chunks (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type         VARCHAR(30) NOT NULL,
    source_id           TEXT        NOT NULL,
    chunk_index         INT         NOT NULL,
    chunk_text          TEXT        NOT NULL,
    content_summary     TEXT,
    embedding           vector(768) NOT NULL,
    metadata            JSONB       DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_chunks_source ON cg_document_chunks (source_type, source_id);
CREATE INDEX idx_cg_chunks_embedding ON cg_document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
