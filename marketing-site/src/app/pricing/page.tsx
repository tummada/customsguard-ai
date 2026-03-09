'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const plans = [
    {
        name: "FREE",
        nameLabel: "ฟรี",
        price: "0",
        period: "",
        description: "เริ่มต้นใช้งานฟรี ไม่ต้องผูกบัตร",
        features: [
            "Scan ใบขน 10 ครั้ง/เดือน",
            "ถาม AI 3 ครั้ง/เดือน (เฉพาะคำถามที่ต้องค้นข้อมูล คุยทักทายไม่นับ)",
            "ค้นหา HS Code อัจฉริยะ (Semantic Search)",
            "เช็กสิทธิ FTA อัตโนมัติ",
            "Chrome Extension เต็มรูปแบบ",
        ],
        cta: "เริ่มใช้ฟรี",
        ctaHref: "/c#waitlist",
        highlight: false,
    },
    {
        name: "PRO",
        nameLabel: "990 บาท/เดือน",
        price: "990",
        period: "บาท/เดือน",
        description: "สำหรับชิปปิ้งที่ออกของทุกวัน",
        features: [
            "Scan + Chat รวม 100 ครั้ง/เดือน",
            "ทุกอย่างใน FREE",
            "ค้นหา HS Code ไม่จำกัด",
            "เช็กสิทธิ FTA ทุก agreement",
            "Magic Fill ฉีดข้อมูลเข้าเว็บกรมศุลฯ",
            "RAG Chat ถามกฎระเบียบ + แหล่งอ้างอิง",
            "รองรับ PDF หลายหน้า",
            "Priority Support",
        ],
        cta: "สนใจ PRO? ติดต่อเรา",
        ctaHref: "#contact",
        highlight: true,
    },
];

const faqs = [
    {
        q: "เริ่มใช้ฟรีได้เลยหรือเปล่า?",
        a: "ได้เลย ไม่ต้องใส่บัตรเครดิต สมัครแล้วใช้ได้ทันที",
    },
    {
        q: "โควต้ารีเซ็ตเมื่อไหร่?",
        a: "โควต้ารีเซ็ตทุกเดือนโดยอัตโนมัติ ไม่ต้องทำอะไรเพิ่ม",
    },
    {
        q: "ยกเลิกได้ไหม?",
        a: "ยกเลิกได้ตลอดเวลา ไม่มีค่าปรับ ไม่มีสัญญาผูกมัด",
    },
    {
        q: "เกิน 100 ครั้ง/เดือนทำยังไง?",
        a: "ติดต่อทีมงานเพื่อขอ package แบบ Custom ที่เหมาะกับปริมาณงานของคุณ",
    },
    {
        q: "จ่ายเงินยังไง?",
        a: "ตอนนี้ชำระผ่าน PromptPay หรือโอนธนาคาร ติดต่อผ่าน LINE OA หรืออีเมล ระบบชำระเงินอัตโนมัติเร็วๆ นี้",
    },
    {
        q: "Founder's Club ลด 50% ยังใช้ได้ไหม?",
        a: "ใช่ -- 10 บริษัทแรกที่สมัคร PRO จ่ายเพียง 495 บาท/เดือน ตลอดการใช้งาน",
    },
];

export default function PricingPage() {
    const luxurySpring = { type: 'spring', stiffness: 140, damping: 30, mass: 1 } as const;

    return (
        <main className="min-h-screen relative bg-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-48 pb-20 text-center px-6">
                <motion.span
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...luxurySpring, delay: 0.1 }}
                    className="inline-block text-xs font-bold text-luxury-gold tracking-[0.5em] uppercase mb-6"
                >
                    Pricing
                </motion.span>
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...luxurySpring, delay: 0.2 }}
                    className="text-4xl md:text-5xl font-light mb-4 tracking-tight font-[family-name:var(--font-prompt)]"
                >
                    เลือกแผนที่เหมาะกับคุณ
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...luxurySpring, delay: 0.3 }}
                    className="text-gray-400 font-light max-w-xl mx-auto"
                >
                    เริ่มต้นฟรี อัปเกรดเมื่อพร้อม ยกเลิกได้ทุกเมื่อ
                </motion.p>
            </section>

            {/* Plans */}
            <section className="px-6 pb-24 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...luxurySpring, delay: 0.3 + idx * 0.15 }}
                            className={`relative rounded-[2rem] p-10 border transition-colors duration-500 flex flex-col ${
                                plan.highlight
                                    ? "border-luxury-gold/40 shadow-[0_20px_80px_rgba(212,175,55,0.07)]"
                                    : "border-gray-100 hover:border-luxury-gold/20"
                            }`}
                        >
                            {plan.highlight && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-luxury-gold text-white text-[10px] font-bold tracking-widest uppercase px-5 py-1.5 rounded-full">
                                    แนะนำ
                                </span>
                            )}

                            <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-gray-400 mb-4">{plan.name}</h2>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-5xl font-black tracking-tighter font-[family-name:var(--font-prompt)]">
                                    {plan.price === "0" ? "ฟรี" : `฿${plan.price}`}
                                </span>
                                {plan.price !== "0" && (
                                    <span className="text-sm text-gray-400 font-medium">/{plan.period}</span>
                                )}
                            </div>

                            <p className="text-sm text-gray-400 font-light mb-8">{plan.description}</p>

                            <ul className="space-y-3 mb-10 flex-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {plan.highlight ? (
                                <a
                                    href="#contact"
                                    className="block text-center py-4 rounded-full font-bold text-sm tracking-widest uppercase transition bg-black text-white hover:bg-neutral-800 shadow-luxury"
                                >
                                    {plan.cta}
                                </a>
                            ) : (
                                <Link
                                    href={plan.ctaHref}
                                    className="block text-center py-4 rounded-full font-bold text-sm tracking-widest uppercase transition bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                >
                                    {plan.cta}
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Custom package */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...luxurySpring, delay: 0.6 }}
                    className="mt-8 text-center p-8 rounded-2xl border border-gray-100"
                >
                    <p className="text-sm text-gray-500">
                        ใช้เกิน 100 ครั้ง/เดือน?{" "}
                        <a href="#contact" className="text-luxury-gold font-bold hover:underline">
                            ติดต่อทีมงาน
                        </a>
                        {" "}เพื่อรับ package แบบ Custom
                    </p>
                </motion.div>
            </section>

            {/* Contact / Payment Section */}
            <section id="contact" className="px-6 pb-32 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ ...luxurySpring }}
                    className="rounded-[2rem] p-10 border border-luxury-gold/20 bg-gradient-to-b from-white to-gray-50/50 text-center"
                >
                    <span className="inline-block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">
                        สนใจ PRO?
                    </span>
                    <h2 className="text-2xl md:text-3xl font-light mb-3 tracking-tight font-[family-name:var(--font-prompt)]">
                        ติดต่อเราได้เลย
                    </h2>
                    <p className="text-sm text-gray-400 font-light mb-8 max-w-md mx-auto">
                        ทีมงานพร้อมช่วยคุณเลือกแผนที่เหมาะสม และเริ่มต้นใช้งานได้ทันที
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        {/* LINE OA button */}
                        <a
                            href="https://lin.ee/vollos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#06C755] text-white font-bold text-sm tracking-wide hover:bg-[#05b34d] transition shadow-lg"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                            LINE OA
                        </a>

                        {/* Email button */}
                        <a
                            href="mailto:support@vollos.ai"
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-black text-white font-bold text-sm tracking-wide hover:bg-neutral-800 transition shadow-luxury"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            support@vollos.ai
                        </a>
                    </div>

                    <p className="text-xs text-gray-400 font-light">
                        ระบบชำระเงินอัตโนมัติเร็วๆ นี้
                    </p>
                </motion.div>
            </section>

            {/* FAQ */}
            <section className="px-6 pb-32 max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ ...luxurySpring }}
                    className="text-center mb-12"
                >
                    <span className="inline-block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">
                        FAQ
                    </span>
                    <h2 className="text-2xl md:text-3xl font-light font-[family-name:var(--font-prompt)]">
                        คำถามเกี่ยวกับราคา
                    </h2>
                </motion.div>
                <div className="space-y-6">
                    {faqs.map((faq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ ...luxurySpring, delay: i * 0.08 }}
                            className="border-b border-gray-100 pb-6"
                        >
                            <h3 className="text-sm font-bold text-gray-800 mb-2 font-[family-name:var(--font-prompt)]">{faq.q}</h3>
                            <p className="text-sm text-gray-400 font-light">{faq.a}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            <Footer />
        </main>
    );
}
