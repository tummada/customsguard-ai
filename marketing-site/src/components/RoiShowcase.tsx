'use client';

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import type { RoiCard, RoiSummary } from "../types/product";

function CountUp({ target, duration = 2000 }: { target: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const start = performance.now();
        const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [inView, target, duration]);

    return <span ref={ref}>{value.toLocaleString()}</span>;
}

interface RoiShowcaseProps {
    kicker: string;
    headline: string;
    cards: RoiCard[];
    summaries: RoiSummary[];
    totalLabel: string;
    totalAmount: string;
}

export function RoiShowcase({ kicker, headline, cards, summaries, totalLabel, totalAmount }: RoiShowcaseProps) {
    return (
        <section id="roi" className="px-6 pb-40 max-w-6xl mx-auto relative z-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: "spring", stiffness: 100, damping: 30 }}
                className="text-center mb-16"
            >
                <span className="inline-block text-[10px] font-bold text-luxury-gold tracking-[0.3em] uppercase mb-4">
                    {kicker}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-normal font-[family-name:var(--font-prompt)]">
                    {headline}
                </h2>
            </motion.div>

            {/* FTA Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {cards.map((card, idx) => (
                    <motion.div
                        key={card.country}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ type: "spring", stiffness: 100, damping: 30, delay: idx * 0.12 }}
                        className="relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-luxury-gold/30 transition-colors duration-500"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl">{card.flag}</span>
                            <div>
                                <p className="font-semibold text-sm font-[family-name:var(--font-prompt)]">{card.country}</p>
                                <p className="text-[10px] font-bold tracking-widest uppercase text-luxury-gold">{card.agreement}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">อัตราปกติ</span>
                                <span className="font-mono font-bold text-gray-400 line-through">{card.normalRate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">อัตรา FTA</span>
                                <span className="font-mono font-bold text-green-600">{card.ftaRate}</span>
                            </div>
                        </div>

                        <div className="bg-luxury-gold/5 border border-luxury-gold/15 rounded-2xl p-4 text-center">
                            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">ประหยัดต่อ Shipment</p>
                            <p className="text-2xl font-black text-luxury-gold font-mono tracking-tight">{card.savingsPerShipment}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Summary Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.3 }}
                className="bg-white rounded-3xl border border-luxury-gold/20 p-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    {summaries.map((s, idx) => (
                        <div key={idx} className="text-center">
                            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">{s.label}</p>
                            <p className="text-xl font-bold font-mono text-gray-700">{s.amount}</p>
                        </div>
                    ))}
                    <div className="text-center md:border-l md:border-luxury-gold/20 md:pl-6">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-luxury-gold mb-2">{totalLabel}</p>
                        <p className="text-3xl md:text-4xl font-black text-luxury-gold font-mono tracking-tight">
                            <CountUp target={3500000} duration={2500} />
                            <span className="text-lg ml-1">+</span>
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-1">{totalAmount}</p>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
