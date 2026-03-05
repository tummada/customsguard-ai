import { queryWithTenant } from './db';

const MARKETING_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    body: string;
    excerpt: string | null;
    product_id: string;
    tags: string[] | null;
    target_keywords: string[] | null;
    references_urls: string[] | null;
    hs_codes_mentioned: string[] | null;
    meta_title: string | null;
    meta_description: string | null;
    og_image_url: string | null;
    image_url: string | null;
    published_at: string;
    created_at: string;
}

export async function getPublishedBlogs(productId: string, limit = 20): Promise<BlogPost[]> {
    if (!process.env.DATABASE_URL) return [];
    const res = await queryWithTenant(
        `SELECT id, slug, title, excerpt, product_id, tags, target_keywords,
                og_image_url, image_url, published_at, created_at
         FROM mkt_content
         WHERE product_id = $1 AND content_type = 'blog' AND status = 'published'
         ORDER BY published_at DESC
         LIMIT $2`,
        [productId, limit],
        MARKETING_TENANT_ID
    );
    return res.rows;
}

export async function getBlogBySlug(productId: string, slug: string): Promise<BlogPost | null> {
    if (!process.env.DATABASE_URL) return null;
    const res = await queryWithTenant(
        `SELECT id, slug, title, body, excerpt, product_id, tags, target_keywords,
                references_urls, hs_codes_mentioned, meta_title, meta_description,
                og_image_url, image_url, published_at, created_at
         FROM mkt_content
         WHERE product_id = $1 AND slug = $2 AND content_type = 'blog' AND status = 'published'
         LIMIT 1`,
        [productId, slug],
        MARKETING_TENANT_ID
    );
    return res.rows[0] || null;
}

export async function getRelatedBlogs(productId: string, currentSlug: string, limit = 3): Promise<BlogPost[]> {
    if (!process.env.DATABASE_URL) return [];
    const res = await queryWithTenant(
        `SELECT id, slug, title, excerpt, og_image_url, image_url, published_at
         FROM mkt_content
         WHERE product_id = $1 AND content_type = 'blog' AND status = 'published'
           AND slug != $2
         ORDER BY published_at DESC
         LIMIT $3`,
        [productId, currentSlug, limit],
        MARKETING_TENANT_ID
    );
    return res.rows;
}
