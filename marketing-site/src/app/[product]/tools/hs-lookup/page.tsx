'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HSCodeToolSchema } from '@/components/StructuredData';

interface HSResult {
    code: string;
    description: string;
    descriptionTh: string;
    similarity: number;
}

export default function HSLookupPage() {
    const params = useParams();
    const product = params.product as string;
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<HSResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.vollos.ai';
            const res = await fetch(`${apiBase}/v1/customsguard/hs-codes/semantic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': '00000000-0000-0000-0000-000000000001' },
                body: JSON.stringify({ query: query.trim(), limit: 10 }),
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            } else {
                setResults([]);
            }
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const url = `https://vollos.ai/${product}/tools/hs-lookup`;

    return (
        <main className="min-h-screen bg-white">
            <HSCodeToolSchema productId={product} url={url} />

            <div className="max-w-3xl mx-auto px-4 py-16">
                <Link href={`/${product}/blog`} className="text-sm text-gray-500 hover:text-[#D4AF37] mb-8 inline-block">
                    &larr; บทความ
                </Link>

                <h1 className="text-4xl font-bold mb-2">ค้นหาพิกัดศุลกากร (HS Code)</h1>
                <p className="text-gray-600 mb-8">
                    ค้นหา HS Code ด้วย AI Semantic Search จาก VOLLOS — พิมพ์ชื่อสินค้าเป็นภาษาไทยหรืออังกฤษได้เลย
                </p>

                <form onSubmit={handleSearch} className="flex gap-3 mb-10">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="เช่น กุ้งแช่แข็ง, power bank, เสื้อผ้าฝ้าย"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#D4AF37] text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-[#D4AF37] text-white font-semibold rounded-lg hover:bg-[#B8972E] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                    </button>
                </form>

                {loading && (
                    <div className="text-center py-10 text-gray-400">กำลังค้นหาด้วย AI...</div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div className="text-center py-10 text-gray-400">ไม่พบผลลัพธ์ ลองใช้คำค้นอื่น</div>
                )}

                {results.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">พบ {results.length} ผลลัพธ์</p>
                        {results.map((r, i) => (
                            <div key={i} className="border border-gray-200 rounded-lg p-5 hover:border-[#D4AF37] transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block bg-gray-900 text-white text-sm font-mono px-3 py-1 rounded mb-2">
                                            {r.code}
                                        </span>
                                        <p className="font-medium">{r.descriptionTh || r.description}</p>
                                        {r.descriptionTh && r.description && (
                                            <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-400 whitespace-nowrap ml-4">
                                        {Math.round(r.similarity * 100)}% match
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <section className="mt-16 pt-8 border-t border-gray-200">
                    <h2 className="text-2xl font-bold mb-4">HS Code คืออะไร?</h2>
                    <p className="text-gray-600 leading-relaxed">
                        HS Code (Harmonized System Code) คือรหัสพิกัดศุลกากรสากลที่ใช้จำแนกสินค้าในการนำเข้า-ส่งออก
                        กำหนดโดยองค์การศุลกากรโลก (WCO) และถูกใช้ทั่วโลกกว่า 200 ประเทศ
                        การระบุ HS Code ที่ถูกต้องช่วยให้คุณชำระภาษีอากรในอัตราที่ถูกต้อง
                        และได้รับสิทธิประโยชน์จาก FTA (Free Trade Agreement) อย่างเต็มที่
                    </p>
                    <p className="text-gray-600 leading-relaxed mt-4">
                        เครื่องมือ VOLLOS HS Code Lookup ใช้ AI Semantic Search
                        ช่วยให้คุณค้นหาพิกัดศุลกากรด้วยภาษาธรรมชาติ ไม่จำเป็นต้องรู้เลขพิกัดล่วงหน้า
                        อ้างอิงข้อมูลจาก<a href="https://www.customs.go.th" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">กรมศุลกากร</a>
                    </p>
                </section>
            </div>
        </main>
    );
}
