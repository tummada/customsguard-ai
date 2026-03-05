import type { BlogPost } from '@/lib/content';

interface ArticleSchemaProps {
    post: BlogPost;
    productId: string;
    url: string;
}

export function ArticleSchema({ post, productId, url }: ArticleSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.meta_title || post.title,
        description: post.meta_description || post.excerpt,
        image: post.og_image_url || post.image_url,
        datePublished: post.published_at,
        dateModified: post.published_at,
        url,
        author: {
            '@type': 'Organization',
            name: 'VOLLOS',
            url: 'https://vollos.ai',
        },
        publisher: {
            '@type': 'Organization',
            name: 'VOLLOS',
            url: 'https://vollos.ai',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        keywords: post.target_keywords?.join(', '),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

interface HSCodeSchemaProps {
    productId: string;
    url: string;
}

export function HSCodeToolSchema({ productId, url }: HSCodeSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'VOLLOS HS Code Lookup',
        description: 'ค้นหาพิกัดศุลกากร (HS Code) ฟรี ด้วย AI Semantic Search',
        url,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'THB',
        },
        author: {
            '@type': 'Organization',
            name: 'VOLLOS',
            url: 'https://vollos.ai',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': 'https://www.customs.go.th',
        },
    };

    const definedTermSet = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: 'Thailand Harmonized System Codes',
        description: 'ฐานข้อมูลพิกัดศุลกากรไทย อ้างอิงจากกรมศุลกากร',
        url,
        inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: 'Harmonized Commodity Description and Coding System',
            url: 'https://www.customs.go.th',
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSet) }}
            />
        </>
    );
}
