-- Enable pgvector (idempotent, in case init-db.sh already ran)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (3072 dimensions = Gemini gemini-embedding-001)
ALTER TABLE cg_hs_codes ADD COLUMN embedding vector(3072);

-- Add flag to track which rows have been embedded
ALTER TABLE cg_hs_codes ADD COLUMN embedded BOOLEAN DEFAULT FALSE;

-- Note: HNSW index max 2000 dims, so we skip index for now.
-- For <1000 rows, exact search (sequential scan) is fast enough.
-- For production with >10K rows, consider IVFFlat index after data is loaded:
-- CREATE INDEX idx_cg_hs_embedding ON cg_hs_codes
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
