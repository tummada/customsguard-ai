-- Fix: add updated_at column to cg_document_chunks (required by BaseEntity)
ALTER TABLE cg_document_chunks
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
