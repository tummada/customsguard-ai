import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "นโยบายความเป็นส่วนตัว | VOLLOS",
    description: "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของ VOLLOS",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-white px-6 py-24">
            <article className="max-w-3xl mx-auto prose prose-gray">
                <Link
                    href="/c"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-black no-underline mb-8 transition-colors"
                >
                    &larr; กลับหน้าหลัก
                </Link>

                <h1 className="text-3xl font-bold tracking-tight mb-2">นโยบายความเป็นส่วนตัว</h1>
                <p className="text-sm text-gray-400 mb-12">ปรับปรุงล่าสุด: มีนาคม 2026</p>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h2>
                    <p>เมื่อคุณลงทะเบียน Founder&apos;s Club ผ่าน Google หรือ LINE เราเก็บเฉพาะ:</p>
                    <ul>
                        <li><strong>ชื่อ</strong> — จาก Google/LINE profile ของคุณ</li>
                        <li><strong>อีเมล</strong> — จาก Google/LINE account ของคุณ</li>
                    </ul>
                    <p>เราไม่เก็บรหัสผ่าน, เบอร์โทรศัพท์, หรือข้อมูลทางการเงินใดๆ</p>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">2. วัตถุประสงค์ในการเก็บข้อมูล</h2>
                    <ul>
                        <li>ติดต่อเพื่อแจ้งสิทธิ์ Founder&apos;s Club และข่าวสารเกี่ยวกับ VOLLOS</li>
                        <li>ปรับปรุงบริการและประสบการณ์การใช้งาน</li>
                    </ul>
                    <p>เราจะไม่ขายหรือแบ่งปันข้อมูลของคุณให้บุคคลที่สาม เว้นแต่จำเป็นตามกฎหมาย</p>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">3. การรักษาความปลอดภัย</h2>
                    <ul>
                        <li>ข้อมูลเก็บในฐานข้อมูลที่มี Row-Level Security (RLS) แยกข้อมูลแต่ละบัญชี</li>
                        <li>การเชื่อมต่อเข้ารหัสด้วย HTTPS/TLS</li>
                        <li>เซิร์ฟเวอร์ตั้งอยู่ในศูนย์ข้อมูลที่ได้มาตรฐาน</li>
                    </ul>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">4. ระยะเวลาการเก็บข้อมูล</h2>
                    <p>
                        เราเก็บข้อมูลตลอดระยะเวลาที่คุณยังเป็นสมาชิก Founder&apos;s Club
                        หรือจนกว่าคุณจะขอลบข้อมูล
                    </p>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">5. สิทธิ์ของคุณตาม PDPA</h2>
                    <p>คุณมีสิทธิ์ดังต่อไปนี้:</p>
                    <ul>
                        <li><strong>ขอเข้าถึง</strong> — ดูข้อมูลที่เราเก็บเกี่ยวกับคุณ</li>
                        <li><strong>ขอแก้ไข</strong> — แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
                        <li><strong>ขอลบ</strong> — ลบข้อมูลของคุณออกจากระบบ</li>
                        <li><strong>ถอนความยินยอม</strong> — ยกเลิกการรับข่าวสารได้ทุกเมื่อ</li>
                        <li><strong>ร้องเรียน</strong> — ยื่นเรื่องต่อสำนักงานคุ้มครองข้อมูลส่วนบุคคล (PDPC)</li>
                    </ul>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">6. บริการของบุคคลที่สาม</h2>
                    <p>เราใช้บริการต่อไปนี้ในการดำเนินงาน:</p>
                    <ul>
                        <li><strong>Google OAuth</strong> — สำหรับยืนยันตัวตน (Google Privacy Policy)</li>
                        <li><strong>LINE Login</strong> — สำหรับยืนยันตัวตน (LINE Privacy Policy)</li>
                        <li><strong>Cloudflare</strong> — สำหรับความปลอดภัยและ CDN</li>
                    </ul>
                </section>

                <section className="mb-10">
                    <h2 className="text-xl font-semibold mb-3">7. ติดต่อเรา</h2>
                    {/* TODO: ใส่ข้อมูลบริษัทจริง */}
                    <p>
                        หากมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ตาม PDPA:
                    </p>
                    <ul>
                        <li>Email: <strong>privacy@vollos.ai</strong></li>
                    </ul>
                    <p className="text-sm text-gray-400 mt-4 italic">
                        หมายเหตุ: เอกสารนี้เป็น draft เบื้องต้น ควรให้ทนายตรวจสอบก่อนใช้งานจริง
                    </p>
                </section>

                <hr className="my-12" />

                <p className="text-xs text-gray-400 text-center">
                    &copy; 2026 VOLLOS Intelligence. All rights reserved.
                </p>
            </article>
        </main>
    );
}
