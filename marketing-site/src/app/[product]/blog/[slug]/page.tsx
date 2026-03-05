import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogBySlug, getRelatedBlogs } from '@/lib/content';
import { ArticleSchema } from '@/components/StructuredData';

interface Props {
    params: Promise<{ product: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { product, slug } = await params;
    const post = await getBlogBySlug(product, slug);
    if (!post) return { title: 'Not Found' };
    return {
        title: post.meta_title || post.title,
        description: post.meta_description || post.excerpt,
        openGraph: {
            title: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
            images: post.og_image_url ? [post.og_image_url] : [],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { product, slug } = await params;
    const post = await getBlogBySlug(product, slug);

    if (!post) notFound();

    const related = await getRelatedBlogs(product, slug);
    const url = `https://vollos.ai/${product}/blog/${slug}`;

    return (
        <main className="min-h-screen bg-white">
            <ArticleSchema post={post} productId={product} url={url} />

            <article className="max-w-3xl mx-auto px-4 py-16">
                <Link href={`/${product}/blog`} className="text-sm text-gray-500 hover:text-[#D4AF37] mb-8 inline-block">
                    &larr; บทความทั้งหมด
                </Link>

                <header className="mb-10">
                    <h1 className="text-4xl font-bold leading-tight mb-4">{post.title}</h1>
                    {post.excerpt && (
                        <p className="text-xl text-gray-600">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                        <time>
                            {post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            }) : ''}
                        </time>
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex gap-2">
                                {post.tags.map((tag) => (
                                    <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {post.image_url && (
                    <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full rounded-lg mb-10"
                    />
                )}

                <div
                    className="prose prose-lg max-w-none
                        prose-headings:font-bold prose-headings:text-black
                        prose-a:text-[#D4AF37] prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-black
                        prose-blockquote:border-l-[#D4AF37]"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(post.body) }}
                />

                {post.references_urls && post.references_urls.length > 0 && (
                    <section className="mt-12 pt-8 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-4">แหล่งอ้างอิง</h3>
                        <ul className="space-y-1">
                            {post.references_urls.map((url, i) => (
                                <li key={i}>
                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                       className="text-sm text-[#D4AF37] hover:underline break-all">
                                        {url}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {related.length > 0 && (
                    <section className="mt-12 pt-8 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-6">บทความที่เกี่ยวข้อง</h3>
                        <div className="grid gap-6">
                            {related.map((r) => (
                                <Link key={r.id} href={`/${product}/blog/${r.slug}`}
                                      className="group">
                                    <h4 className="font-medium group-hover:text-[#D4AF37] transition-colors">
                                        {r.title}
                                    </h4>
                                    {r.excerpt && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{r.excerpt}</p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </main>
    );
}

function markdownToHtml(md: string): string {
    return md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '');
}
