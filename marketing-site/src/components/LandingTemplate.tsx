'use client';

import Image from "next/image";
import { motion } from "framer-motion";
import { BentoCard } from "./BentoCard";
import { LeadForm } from "./LeadForm";
import { TargetIcon, ShieldIcon, ZapIcon, UploadIcon, SearchAIIcon, SparklesIcon } from "./Icons";
import { RadarBlueprint } from "./RadarBlueprint";
import { TimeCollapse } from "./TimeCollapse";
import { ProductConfig } from "../types/product";

interface LandingTemplateProps {
    config: ProductConfig;
}

export function LandingTemplate({ config }: LandingTemplateProps) {
    const luxurySpring = { type: 'spring', stiffness: 140, damping: 30, mass: 1 } as const;

    // Helper function to render the correct icon component based on the ID
    const renderIcon = (iconId: string | undefined) => {
        switch (iconId) {
            case 'upload': return <UploadIcon />;
            case 'search-ai': return <SearchAIIcon />;
            case 'sparkles': return <SparklesIcon />;
            case 'target': return <TargetIcon />;
            case 'zap': return <ZapIcon />;
            case 'shield': return <ShieldIcon />;
            default: return null;
        }
    };

    const processSteps = config.process.steps;
    const headlineParts = config.hero.headlineMain.split('<time_collapse>');

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
                        <motion.a whileHover={{ scale: 0.98 }} transition={luxurySpring} href="#waitlist" className="bg-black text-white px-8 py-3 rounded-full hover:bg-neutral-800 transition shadow-luxury">{config.navbar.ctaText}</motion.a>
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
                        {config.hero.kicker}
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.2 }}
                        className="text-4xl md:text-6xl font-light mb-8 leading-[1.3] tracking-tight font-[family-name:var(--font-prompt)]"
                    >
                        {headlineParts.length > 1 ? (
                            <>
                                <span dangerouslySetInnerHTML={{ __html: headlineParts[0] }} />
                                <TimeCollapse />
                                <span dangerouslySetInnerHTML={{ __html: headlineParts[1] }} />
                            </>
                        ) : (
                            <span dangerouslySetInnerHTML={{ __html: config.hero.headlineMain }} />
                        )}
                    </motion.h1>
                    {/* Sub-headline */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 40, mass: 2, delay: 0.4 }}
                        className="text-xl font-[family-name:var(--font-prompt)] font-light text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed"
                    >
                        {config.hero.subheadline}
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
                            src={config.hero.demoImageSrc}
                            alt={config.hero.demoImageAlt}
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
                            src={config.pain.imageSrc}
                            alt={config.pain.imageAlt}
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
                            {config.pain.kicker}
                        </span>
                        <h2
                            className="text-3xl md:text-4xl font-bold tracking-tight mb-6"
                            dangerouslySetInnerHTML={{ __html: config.pain.headline }}
                        />
                        <p className="text-gray-400 font-light leading-relaxed mb-8 text-sm lg:text-base">
                            {config.pain.description}
                        </p>
                        <div className="space-y-3">
                            {config.pain.stats.map((item, i) => (
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
                        {config.process.kicker}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        {config.process.headline}
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
                                <div className="mb-6">{renderIcon(item.iconId)}</div>
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

                    {/* Features mapped from config */}
                    {config.features.cards.map((card, i) => (
                        <div key={card.id} className={i === 0 ? "md:col-span-7" : "md:col-span-5"}>
                            <BentoCard className={i === 0
                                ? "h-full min-h-[380px] flex flex-col justify-between"
                                : "h-full min-h-[380px] flex flex-col items-center justify-center text-center"
                            }>
                                {i === 0 ? (
                                    <>
                                        <div>
                                            <div className="mb-8">
                                                {renderIcon(card.iconId)}
                                            </div>
                                            <h3 className="text-4xl font-semibold mb-4 tracking-tight font-[family-name:var(--font-inter)] uppercase">{card.title}</h3>
                                            <p className="text-gray-400 max-w-md font-light leading-relaxed">
                                                {card.description}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-4 items-center text-[10px] font-bold tracking-widest uppercase text-luxury-gold">
                                            {card.badges?.map((badge, bIdx) => (
                                                <span key={bIdx} className="bg-luxury-gold/5 px-4 py-2 rounded-full border border-luxury-gold/10">{badge}</span>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-6">{renderIcon(card.iconId)}</div>
                                        <h4 className="text-7xl font-black text-luxury-gold mb-2 tracking-tighter">{card.statValue}</h4>
                                        <p className="text-xs font-bold tracking-[0.2em] uppercase">{card.statLabel}</p>
                                        <div className="mt-8 text-sm text-gray-400 font-medium max-w-[200px] leading-relaxed">
                                            {card.description}
                                        </div>
                                    </>
                                )}
                            </BentoCard>
                        </div>
                    ))}

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
                                        <h3 className="text-xl font-semibold tracking-tight mb-2 font-[family-name:var(--font-prompt)]">{config.security.headline}</h3>
                                        <p className="text-gray-400 text-sm font-light leading-relaxed font-[family-name:var(--font-prompt)]">
                                            {config.security.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Visual Data Labels */}
                                <div className="flex flex-wrap gap-3 font-[family-name:var(--font-inter)] text-[10px] font-bold tracking-tight">
                                    {config.security.labels.map((label, idx) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-2 rounded-md flex items-center gap-2 uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: System Status */}
                            <div className="border-l border-gray-100 pl-8">
                                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-5 font-[family-name:var(--font-prompt)]">สถานะการปกป้องข้อมูล</p>
                                <div className="space-y-4">
                                    {config.security.statusLines.map((line, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                            <span className="text-sm font-medium font-[family-name:var(--font-prompt)] text-gray-600">
                                                {line.label}: <span className={line.statusColor}>{line.status}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </BentoCard>

                    {/* ─── Row 3 ─── */}

                    {/* Founder's Club Waitlist — full-width form card */}
                    <BentoCard id="waitlist" className="md:col-span-12 shadow-luxury h-auto !p-0">
                        <LeadForm productCategory={config.productCategory} />
                    </BentoCard>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-gray-50 text-center relative z-10">
                <Image src="/images/logo.svg" alt="VOLLOS" width={550} height={518} className="mx-auto mb-3 h-12 w-auto opacity-100" />
                <p className="text-[11px] font-medium tracking-[0.35em] uppercase text-gray-400 mb-8">
                    {config.footer.tagline}
                </p>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                    {config.footer.copyright}
                </p>
            </footer>
        </main>
    );
}
