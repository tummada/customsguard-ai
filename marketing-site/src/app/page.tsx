'use client';

import Image from "next/image";
import { motion } from "framer-motion";
import { BentoCard } from "@/components/BentoCard";
import { LeadForm } from "@/components/LeadForm";
import { TargetIcon, ShieldIcon, ZapIcon, UploadIcon, SearchAIIcon, SparklesIcon } from "@/components/Icons";
import { RadarBlueprint } from "@/components/RadarBlueprint";
import { TimeCollapse } from "@/components/TimeCollapse";

export default function LandingPage() {
    const luxurySpring = { type: 'spring', stiffness: 140, damping: 30, mass: 1 } as const;

    const processSteps = [
        {
            icon: <UploadIcon />,
            step: "01",
            title: "อัปโหลด PDF",
            desc: "โยนไฟล์ Invoice หรือ Packing List เข้าสู่ระบบ",
            imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=PDF+Scanning+Demo",
            imgAlt: "PDF Scanning Demo",
        },
        {
            icon: <SearchAIIcon />,
            step: "02",
            title: "AI ตรวจพิกัด",
            desc: "AI วิเคราะห์ HS-Code และภาษีที่ประหยัดที่สุด",
            imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=AI+HS-Code+Analysis",
            imgAlt: "AI HS-Code Analysis",
        },
        {
            icon: <SparklesIcon />,
            step: "03",
            title: "Magic Fill",
            desc: "กดปุ่มเดียว ข้อมูลไหลเข้าระบบศุลกากรอัตโนมัติ ผ่าน Chrome Extension ไม่ต้องพิมพ์ซ้ำอีกต่อไป",
            imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=Chrome+Extension+Demo",
            imgAlt: "Magic Fill — Chrome Extension",
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
            <section className="pt-56 pb-40 text-center px-6 relative z-10">
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
                        className="text-4xl md:text-6xl font-light mb-8 leading-[1.3] tracking-tight"
                    >
                        เปลี่ยนมาตรฐานการจัดการใบขนสินค้า.<br />
                        จาก<TimeCollapse />สู่ความแม่นยำระดับ 100%
                    </motion.h1>
                    {/* Sub-headline */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.4 }}
                        className="text-xl font-[family-name:var(--font-prompt)] font-light text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed"
                    >
                        แม่นยำ 100% ด้วย AI วิเคราะห์พิกัดอัตโนมัติ สำหรับชิปปิ้งและ SME ไทย
                    </motion.p>

                    {/* Video Demo Placeholder */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.6 }}
                        className="mt-4 aspect-video rounded-[2.5rem] overflow-hidden border border-luxury-gold/10 shadow-[0_20px_80px_rgba(212,175,55,0.07)]"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://placehold.co/1280x720/FAFAFA/D4AF37?text=VOLLOS+AI+Workflow+Demo"
                            alt="VOLLOS AI Workflow Demo"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </div>
            </section>

            {/* ─── Pain Point Section ─── */}
            <section className="px-6 pb-40 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left: Placeholder image */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ type: "spring", stiffness: 100, damping: 30 }}
                        className="rounded-[2.5rem] overflow-hidden border border-gray-100"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://placehold.co/600x400/FAFAFA/999999?text=Manual+Entry+Errors"
                            alt="ความผิดพลาดจากการคีย์ข้อมูลด้วยมือ"
                            className="w-full object-cover"
                        />
                    </motion.div>

                    {/* Right: Pain text */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.1 }}
                    >
                        <span className="inline-block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">
                            ต้นทุนที่ซ่อนอยู่
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                            หยุดจ่ายค่าปรับ<br />ที่คุณไม่ได้ก่อ
                        </h2>
                        <p className="text-gray-400 font-light leading-relaxed mb-8 text-sm lg:text-base">
                            HS-Code ผิด 1 ตัว = ค่าปรับหลักแสน และเสียเวลาหลักสัปดาห์
                            ความผิดพลาดส่วนใหญ่เกิดจากการคีย์ซ้ำที่เหนื่อย ไม่ใช่ความประมาท
                        </p>
                        <div className="space-y-3">
                            {[
                                { stat: "73%", label: "ของข้อผิดพลาดมาจากการคีย์ด้วยมือ" },
                                { stat: "3 ชม.", label: "เฉลี่ยต่อใบขน 1 รายการ" },
                                { stat: "฿120K+", label: "ค่าปรับเฉลี่ยต่อครั้งจากพิกัดผิด" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 12 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.2 + i * 0.1 }}
                                    className="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 border border-gray-100"
                                >
                                    <span className="text-2xl font-black text-luxury-gold shrink-0 font-mono tracking-tight">{item.stat}</span>
                                    <span className="text-sm text-gray-500 font-medium">{item.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ─── Process Steps ─── */}
            <section className="px-6 pb-64 max-w-5xl mx-auto relative z-10">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                    {processSteps.map((item, idx) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ type: "spring", stiffness: 100, damping: 30, mass: 1, delay: idx * 0.15 }}
                            className="relative bg-white rounded-[2.5rem] p-8 border border-[rgba(212,175,55,0.2)] hover:border-luxury-gold/40 transition-colors duration-500 group h-full flex flex-col"
                        >
                            {/* Step number */}
                            <span className="absolute top-6 right-6 text-[10px] font-bold text-gray-200 tracking-widest">
                                {item.step}
                            </span>

                            {/* Content: Icon + Title + Desc — grows to fill available space */}
                            <div className="flex flex-col flex-1">
                                <div className="mb-6">{item.icon}</div>
                                <h3 className="text-xl font-semibold mb-3 tracking-tight font-[family-name:var(--font-inter)] uppercase">{item.title}</h3>
                                <p className="text-gray-400 font-light leading-relaxed text-sm">{item.desc}</p>
                            </div>

                            {/* Connector line (steps 01 and 02 only) */}
                            {idx < 2 && (
                                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-luxury-gold/30 to-transparent" />
                            )}

                            {/* Image — mt-auto pushes it to card bottom, all cards align */}
                            <div className="mt-auto pt-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.imgSrc}
                                    alt={item.imgAlt}
                                    className="w-full aspect-video object-cover rounded-xl border border-luxury-gold/10"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Bento Grid — balanced 2-row layout */}
            <section id="features" className="px-6 pb-64 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

                    {/* ─── Row 1 ─── */}

                    {/* AI HS-Code Suggestion — wider, hero card */}
                    <div className="md:col-span-7">
                        <BentoCard className="h-full min-h-[380px] flex flex-col justify-between">
                            <div>
                                <div className="mb-8">
                                    <TargetIcon />
                                </div>
                                <h3 className="text-4xl font-semibold mb-4 tracking-tight font-[family-name:var(--font-inter)] uppercase">AI HS-Code Suggestion</h3>
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

                    {/* Data Privacy & Security — harmonized 2-col grid */}
                    <BentoCard id="security" className="md:col-span-12 py-8 px-12 h-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            {/* Left: Shield + text + badges */}
                            <div className="flex flex-col gap-6">
                                <div className="flex items-start gap-6">
                                    <div className="shrink-0">
                                        <ShieldIcon />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold tracking-tight mb-2 font-[family-name:var(--font-prompt)]">ความปลอดภัยและการรักษาความลับ</h3>
                                        <p className="text-gray-400 text-sm font-light leading-relaxed font-[family-name:var(--font-prompt)]">
                                            เราดูแลข้อมูลของคุณเหมือนเป็นสมบัติของตัวเอง. สำรองข้อมูลบัญชีให้พร้อมใช้เสมอ และไม่เปิดเผยข้อมูลการค้าใน Invoice ของคุณให้ใครเห็น 100%
                                        </p>
                                    </div>
                                </div>

                                {/* Visual Data Labels */}
                                <div className="flex flex-wrap gap-3 font-[family-name:var(--font-inter)] text-[10px] font-bold tracking-tight">
                                    <div className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-2 rounded-md flex items-center gap-2 uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        AES-256 ENCRYPTED
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-2 rounded-md flex items-center gap-2 uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        ISO-27001 READY
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-2 rounded-md flex items-center gap-2 uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        PDPA COMPLIANT
                                    </div>
                                </div>
                            </div>

                            {/* Right: System Status */}
                            <div className="border-l border-gray-100 pl-8">
                                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-5 font-[family-name:var(--font-prompt)]">สถานะการปกป้องข้อมูล</p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                        <span className="text-sm font-medium font-[family-name:var(--font-prompt)] text-gray-600">
                                            การเชื่อมต่อ: <span className="text-green-600">ปลอดภัยสูงสุด</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                        <span className="text-sm font-medium font-[family-name:var(--font-prompt)] text-gray-600">
                                            ข้อมูลการค้า: <span className="text-green-600">เป็นส่วนตัว 100%</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                        <span className="text-sm font-medium font-[family-name:var(--font-prompt)] text-gray-600">
                                            ระบบสำรอง: <span className="text-green-600">ทำงานตลอดเวลา</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BentoCard>

                    {/* ─── Row 3 ─── */}

                    {/* Founder's Club Waitlist — full-width form card */}
                    <BentoCard id="waitlist" className="md:col-span-12 shadow-luxury h-auto !p-0">
                        <LeadForm />
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
