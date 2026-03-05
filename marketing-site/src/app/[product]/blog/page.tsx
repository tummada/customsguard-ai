import Link from 'next/link';
import { getPublishedBlogs } from '@/lib/content';

interface Props {
    params: Promise<{ product: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { product } = await params;
    return {
        title: `บทความ | VOLLOS ${product}`,
        description: `บทความและความรู้เกี่ยวกับ ${product} จาก VOLLOS`,
    };
}

export default async function BlogListPage({ params }: Props) {
    const { product } = await params;
    const posts = await getPublishedBlogs(product);

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <Link href={`/${product}`} className="text-sm text-gray-500 hover:text-[#D4AF37] mb-8 inline-block">
                    &larr; กลับหน้าหลัก
                </Link>

                <h1 className="text-4xl font-bold mb-2">บทความ</h1>
                <p className="text-gray-600 mb-12">ความรู้ด้านศุลกากรและการนำเข้า-ส่งออก จาก VOLLOS</p>

                {posts.length === 0 ? (
                    <p className="text-gray-400 text-center py-20">ยังไม่มีบทความ</p>
                ) : (
                    <div className="space-y-8">
                        {posts.map((post) => (
                            <article key={post.id} className="border-b border-gray-100 pb-8">
                                <Link href={`/${product}/blog/${post.slug}`} className="group">
                                    <h2 className="text-2xl font-semibold group-hover:text-[#D4AF37] transition-colors">
                                        {post.title}
                                    </h2>
                                    {post.excerpt && (
                                        <p className="text-gray-600 mt-2 line-clamp-2">{post.excerpt}</p>
                                    )}
                                    <time className="text-sm text-gray-400 mt-3 block">
                                        {post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        }) : ''}
                                    </time>
                                </Link>
                                {post.tags && post.tags.length > 0 && (
                                    <div className="flex gap-2 mt-3">
                                        {post.tags.map((tag) => (
                                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
