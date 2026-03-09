'use client';

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const sections = [
    {
        title: "1. ข้อมูลที่เราเก็บรวบรวม",
        content: (
            <>
                <p>เมื่อคุณลงทะเบียน Founder&apos;s Club ผ่าน Google หรือ LINE เราเก็บเฉพาะ:</p>
                <ul>
                    <li><strong>ชื่อ</strong> — จาก Google/LINE profile ของคุณ</li>
                    <li><strong>อีเมล</strong> — จาก Google/LINE account ของคุณ</li>
                </ul>
                <p>เราไม่เก็บรหัสผ่าน, เบอร์โทรศัพท์, หรือข้อมูลทางการเงินใดๆ</p>
            </>
        ),
    },
    {
        title: "2. วัตถุประสงค์ในการเก็บข้อมูล",
        content: (
            <>
                <ul>
                    <li>ติดต่อเพื่อแจ้งสิทธิ์ Founder&apos;s Club และข่าวสารเกี่ยวกับ VOLLOS</li>
                    <li>ปรับปรุงบริการและประสบการณ์การใช้งาน</li>
                </ul>
                <p>เราจะไม่ขายหรือแบ่งปันข้อมูลของคุณให้บุคคลที่สาม เว้นแต่จำเป็นตามกฎหมาย</p>
            </>
        ),
    },
    {
        title: "3. การรักษาความปลอดภัย",
        content: (
            <ul>
                <li>ข้อมูลเก็บในฐานข้อมูลที่มี Row-Level Security (RLS) แยกข้อมูลแต่ละบัญชี</li>
                <li>การเชื่อมต่อเข้ารหัสด้วย HTTPS/TLS</li>
                <li>เซิร์ฟเวอร์ตั้งอยู่ในศูนย์ข้อมูลที่ได้มาตรฐาน</li>
            </ul>
        ),
    },
    {
        title: "4. ระยะเวลาการเก็บข้อมูล",
        content: (
            <p>
                เราเก็บข้อมูลตลอดระยะเวลาที่คุณยังเป็นสมาชิก Founder&apos;s Club
                หรือจนกว่าคุณจะขอลบข้อมูล
            </p>
        ),
    },
    {
        title: "5. สิทธิ์ของคุณตาม PDPA",
        content: (
            <>
                <p>คุณมีสิทธิ์ดังต่อไปนี้:</p>
                <ul>
                    <li><strong>ขอเข้าถึง</strong> — ดูข้อมูลที่เราเก็บเกี่ยวกับคุณ</li>
                    <li><strong>ขอแก้ไข</strong> — แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
                    <li><strong>ขอลบ</strong> — ลบข้อมูลของคุณออกจากระบบ</li>
                    <li><strong>ถอนความยินยอม</strong> — ยกเลิกการรับข่าวสารได้ทุกเมื่อ</li>
                    <li><strong>ร้องเรียน</strong> — ยื่นเรื่องต่อสำนักงานคุ้มครองข้อมูลส่วนบุคคล (PDPC)</li>
                </ul>
            </>
        ),
    },
    {
        title: "6. บริการของบุคคลที่สาม",
        content: (
            <>
                <p>เราใช้บริการต่อไปนี้ในการดำเนินงาน:</p>
                <ul>
                    <li><strong>Google OAuth</strong> — สำหรับยืนยันตัวตน (Google Privacy Policy)</li>
                    <li><strong>LINE Login</strong> — สำหรับยืนยันตัวตน (LINE Privacy Policy)</li>
                    <li><strong>Cloudflare</strong> — สำหรับความปลอดภัยและ CDN</li>
                </ul>
            </>
        ),
    },
    {
        title: "7. ติดต่อเรา",
        content: (
            <>
                <p>หากมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ตาม PDPA:</p>
                <ul>
                    <li>Email: <strong>privacy@vollos.ai</strong></li>
                </ul>
                <p className="text-sm text-gray-400 mt-4 italic">
                    หมายเหตุ: เอกสารนี้เป็น draft เบื้องต้น ควรให้ทนายตรวจสอบก่อนใช้งานจริง
                </p>
            </>
        ),
    },
];

export function PrivacyContent() {
    return (
        <main className="min-h-screen relative">
            <Navbar />

            {/* Content */}
            <section className="pt-40 pb-24 px-6 relative z-10">
                <article className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-16">
                        <Link
                            href="/c"
                            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-luxury-gold no-underline mb-8 transition-colors"
                        >
                            &larr; กลับหน้าหลัก
                        </Link>
                        <span className="block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">Privacy Policy</span>
                        <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 font-[family-name:var(--font-prompt)]">
                            นโยบายความเป็นส่วนตัว
                        </h1>
                        <p className="text-sm text-gray-400">ปรับปรุงล่าสุด: มีนาคม 2026</p>
                    </div>

                    {/* Sections */}
                    <div className="space-y-10">
                        {sections.map((section, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-gray-100 p-8 hover:border-luxury-gold/20 transition-colors duration-300"
                            >
                                <h2 className="text-lg font-semibold mb-4 tracking-normal font-[family-name:var(--font-prompt)]">
                                    {section.title}
                                </h2>
                                <div className="text-sm text-gray-600 font-light leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_strong]:font-medium [&_strong]:text-gray-800">
                                    {section.content}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <Footer />
        </main>
    );
}
