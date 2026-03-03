-- =============================================================
-- Pipeline State tracking + Provenance fields
-- =============================================================

-- 1. Pipeline state tracking (used by data-pipeline scripts)
CREATE TABLE IF NOT EXISTS _pipeline_state (
    pipeline_name  VARCHAR(100) NOT NULL,
    source_key     VARCHAR(500) NOT NULL,
    status         VARCHAR(20)  DEFAULT 'COMPLETED',
    result_summary TEXT,
    error_message  TEXT,
    processed_at   TIMESTAMPTZ  DEFAULT NOW(),
    PRIMARY KEY (pipeline_name, source_key)
);

-- 2. Add source_url to cg_hs_codes for provenance tracking
ALTER TABLE cg_hs_codes ADD COLUMN IF NOT EXISTS source_url TEXT;
