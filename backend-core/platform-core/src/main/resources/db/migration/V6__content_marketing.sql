-- V6: Content Marketing table
-- Stores blog posts, social media posts, and all content created by AI Multi-Agent System
-- Supports multi-product (customsguard, future products)

CREATE TABLE mkt_content (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,

    -- Content
    slug VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    excerpt TEXT,

    -- Metadata
    content_type VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL DEFAULT 'customsguard',
    pillar_id UUID,
    tags TEXT[],
    target_keywords TEXT[],

    -- AI metadata
    ai_model TEXT,
    references_urls TEXT[],
    hs_codes_mentioned TEXT[],
    confidence_score SMALLINT,

    -- Fact-check
    is_fact_checked BOOLEAN NOT NULL DEFAULT false,
    fact_check_note TEXT,
    customs_verify_url TEXT,

    -- Publishing
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    platform_post_id TEXT,

    -- Image
    image_prompt TEXT,
    image_url TEXT,

    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    og_image_url TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE mkt_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY mkt_content_tenant_isolation ON mkt_content
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_mkt_content_status ON mkt_content(status, scheduled_at);
CREATE INDEX idx_mkt_content_type ON mkt_content(content_type, status);
CREATE INDEX idx_mkt_content_product ON mkt_content(product_id, content_type, status);
CREATE INDEX idx_mkt_content_slug ON mkt_content(tenant_id, product_id, slug)
    WHERE content_type = 'blog';
