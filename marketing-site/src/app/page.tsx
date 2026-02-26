'use client';

import Image from "next/image";
import { motion } from "framer-motion";
import { BentoCard } from "@/components/BentoCard";
import { LeadForm } from "@/components/LeadForm";
import { TargetIcon, ShieldIcon, ZapIcon, UploadIcon, SearchAIIcon, SparklesIcon } from "@/components/Icons";
import { TimeCollapse } from "@/components/TimeCollapse";
import { RadarBlueprint } from "@/components/RadarBlueprint";

export default function LandingPage() {
    const luxurySpring = { type: 'spring', stiffness: 140, damping: 30, mass: 1 } as const;

    const processSteps = [
        {
            icon: <UploadIcon />,
            step: "01",
            title: "อัปโหลด PDF",
            desc: "โยนไฟล์ Invoice หรือ Packing List เข้าสู่ระบบ",
        },
        {
            icon: <SearchAIIcon />,
            step: "02",
            title: "AI ตรวจพิกัด",
            desc: "AI วิเคราะห์ HS-Code และภาษีที่ประหยัดที่สุด",
        },
        {
            icon: <SparklesIcon />,
            step: "03",
            title: "Magic Fill",
            desc: "กดปุ่มเดียว ข้อมูลไหลเข้าระบบใบขนอัตโนมัติ",
        },
    ];

    return (
        <main className="min-h-screen relative">
            {/* Radar Blueprint: mouse-tracking gold glow */}
            <RadarBlueprint />

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-xl border-b border-gray-100/30">
                <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                    <motion.div
                        className="pl-4"
                        whileHover={{ filter: "drop-shadow(0 0 12px rgba(212, 175, 55, 0.4))", scale: 1.02 }}
                        transition={luxurySpring}
                    >
                        <Image src="/images/logo.svg" alt="VOLLOS" width={550} height={518} className="h-14 w-auto object-contain" priority />
                    </motion.div>
                    <div className="hidden md:flex items-center gap-12 text-[13px] font-bold tracking-widest uppercase text-gray-500">
                        <motion.a whileHover={{ scale: 0.98 }} transition={luxurySpring} href="#features" className="hover:text-black transition">ฟีเจอร์</motion.a>
                        <motion.a whileHover={{ scale: 0.98 }} transition={luxurySpring} href="#security" className="hover:text-black transition">ความปลอดภัย</motion.a>
                        <motion.a whileHover={{ scale: 0.98 }} transition={luxurySpring} href="#waitlist" className="bg-black text-white px-8 py-3 rounded-full hover:bg-neutral-800 transition shadow-luxury">จองสิทธิ์ด่วน</motion.a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-48 pb-48 text-center px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.span
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.1 }}
                        className="inline-block text-xs font-bold text-luxury-gold tracking-[0.5em] uppercase mb-8"
                    >
                        เมื่อเวลาของคุณ... กลายเป็นมูลค่า
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.2 }}
                        className="text-4xl md:text-6xl font-light mb-10 leading-[1.3] tracking-tight"
                    >
                        หยุดนรกการคีย์ใบขน!<br />
                        <span className="text-luxury-gold">รับมือภาษี VAT 2026</span> ทุกชิ้นด้วย AI
                    </motion.h1>
                    {/* Sub-headline with TimeCollapse animation */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.4 }}
                        className="text-xl text-gray-500 font-light max-w-2xl mx-auto mb-16 leading-relaxed"
                    >
                        เปลี่ยนจากงาน{" "}
                        <TimeCollapse />{" "}
                        ด้วยความแม่นยำระดับสูงสุด
                    </motion.p>
                </div>
            </section>

            {/* ─── Process Steps ─── */}
            <section className="px-6 pb-48 max-w-5xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ type: "spring", stiffness: 100, damping: 30, mass: 1 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">
                        ขั้นตอนง่ายๆ 3 ขั้นตอน
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        ทำงานยังไง? ง่ายมาก.
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {processSteps.map((item, idx) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ type: "spring", stiffness: 100, damping: 30, mass: 1, delay: idx * 0.15 }}
                            className="relative bg-white rounded-3xl p-8 border border-[rgba(212,175,55,0.2)] hover:border-luxury-gold/40 transition-all duration-500 group"
                        >
                            {/* Step number */}
                            <span className="absolute top-6 right-6 text-[10px] font-bold text-gray-200 tracking-widest">
                                {item.step}
                            </span>

                            {/* Icon — raw blueprint style, no background */}
                            <div className="mb-6">
                                {item.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold mb-3 tracking-tight">{item.title}</h3>
                            <p className="text-gray-400 font-light leading-relaxed text-sm">{item.desc}</p>

                            {/* Connector line (not on last item) */}
                            {idx < processSteps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-luxury-gold/30 to-transparent" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Bento Grid — balanced 2-row layout */}
            <section id="features" className="px-6 pb-48 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* ─── Row 1 ─── */}

                    {/* AI HS-Code Suggestion — wider, hero card */}
                    <div className="md:col-span-7">
                        <BentoCard className="h-full min-h-[380px] flex flex-col justify-between">
                            <div>
                                <div className="mb-8">
                                    <TargetIcon />
                                </div>
                                <h3 className="text-4xl font-bold mb-4 tracking-tight">AI HS-Code Suggestion</h3>
                                <p className="text-gray-400 max-w-md font-light leading-relaxed">
                                    ไม่ต้องงมพิกัดศุลกากร AI แนะนำ HS-Code ให้อัตโนมัติ ตรวจสอบใบขนสินค้าให้ถูกต้อง 100% ก่อนยื่น
                                </p>
                            </div>
                            <div className="flex gap-4 items-center text-[10px] font-bold tracking-widest uppercase text-luxury-gold">
                                <span className="bg-luxury-gold/5 px-4 py-2 rounded-full border border-luxury-gold/10">AI แม่นยำ</span>
                                <span className="bg-luxury-gold/5 px-4 py-2 rounded-full border border-luxury-gold/10">ตรวจพิกัดอัตโนมัติ</span>
                            </div>
                        </BentoCard>
                    </div>

                    {/* Efficiency Metric — compact, impact card */}
                    <BentoCard className="md:col-span-5 min-h-[380px] flex flex-col items-center justify-center text-center">
                        <div className="mb-6"><ZapIcon /></div>
                        <h4 className="text-7xl font-black text-luxury-gold mb-2 tracking-tighter">98.2%</h4>
                        <p className="text-xs font-bold tracking-[0.2em] uppercase">ลดเวลาทำงาน</p>
                        <div className="mt-8 text-sm text-gray-400 font-medium max-w-[200px] leading-relaxed">
                            ลดเวลาจัดทำเอกสารศุลกากร จากชั่วโมงเหลือนาที
                        </div>
                    </BentoCard>

                    {/* ─── Row 2 ─── */}

                    {/* Founder's Club Waitlist — form card */}
                    <BentoCard id="waitlist" className="md:col-span-7 shadow-luxury h-auto">
                        <LeadForm />
                    </BentoCard>

                    {/* Data Privacy — info card */}
                    <BentoCard id="security" className="md:col-span-5 flex flex-col justify-center">
                        <div>
                            <div className="mb-8">
                                <ShieldIcon />
                            </div>
                            <span className="inline-block text-sm font-medium text-gray-300 tracking-widest uppercase mb-4">มาตรฐานความปลอดภัย</span>
                            <h3 className="text-2xl font-bold mb-4 tracking-tight">ข้อมูลธุรกิจคุณ ปลอดภัย 100%</h3>
                            <p className="text-gray-400 text-sm font-light leading-relaxed mb-4">
                                ข้อมูลของคุณถูกเข้ารหัสตั้งแต่ต้นทางตามมาตรฐานสากล และ VOLLOS ปฏิบัติตามข้อกำหนด PDPA อย่างเคร่งครัด
                            </p>
                            {/* ISO / PDPA Verified Badge */}
                            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200/60 rounded-full px-4 py-1.5 mb-6">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                <span className="text-[10px] font-bold text-green-700 tracking-wide">มาตรฐาน ISO 27001 & PDPA</span>
                            </div>
                            <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
                                ข้อมูลถูกจัดเก็บใน Server มาตรฐานสากล พร้อมระบบสำรองข้อมูลทุก 24 ชม.
                            </p>
                            {/* Animated progress bars */}
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <motion.div
                                            initial={{ x: "-100%" }}
                                            animate={{ x: "100%" }}
                                            transition={{ repeat: Infinity, duration: 2 + i, ease: "linear" }}
                                            className="w-1/2 h-full bg-luxury-gold/20"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </BentoCard>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-gray-50 text-center relative z-10">
                <Image src="/images/logo.svg" alt="VOLLOS" width={550} height={518} className="mx-auto mb-3 h-12 w-auto opacity-100" />
                <p className="text-[11px] font-medium tracking-[0.35em] uppercase text-gray-400 mb-8">
                    Where Time Becomes Value
                </p>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                    © 2026 VOLLOS Intelligence. Compliant with Customs Department standards 2026
                </p>
            </footer>
        </main>
    );
}
