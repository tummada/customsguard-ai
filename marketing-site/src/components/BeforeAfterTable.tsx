'use client';

import { motion } from "framer-motion";
import type { BeforeAfterRow } from "../types/product";

interface BeforeAfterTableProps {
    kicker: string;
    headline: string;
    badge: string;
    rows: BeforeAfterRow[];
}

export function BeforeAfterTable({ kicker, headline, badge, rows }: BeforeAfterTableProps) {
    return (
        <section id="compare" className="px-6 pb-40 max-w-5xl mx-auto relative z-10">
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
                <h2 className="text-3xl md:text-4xl font-bold tracking-normal font-[family-name:var(--font-prompt)] mb-4">
                    {headline}
                </h2>
                <span className="inline-block bg-luxury-gold/10 text-luxury-gold text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
                    {badge}
                </span>
            </motion.div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-100">
                    <div className="col-span-4 px-6 py-4">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">งาน</span>
                    </div>
                    <div className="col-span-4 px-6 py-4">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-red-400">วิธีเดิม</span>
                    </div>
                    <div className="col-span-4 px-6 py-4">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-luxury-gold">ด้วย VOLLOS</span>
                    </div>
                </div>

                {/* Rows */}
                {rows.map((row, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 100, damping: 30, delay: idx * 0.08 }}
                        className={`grid grid-cols-12 gap-0 ${idx < rows.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                        <div className="col-span-4 px-6 py-5">
                            <span className="text-sm font-semibold text-gray-700 font-[family-name:var(--font-prompt)]">
                                {row.task}
                            </span>
                        </div>
                        <div className="col-span-4 px-6 py-5 bg-red-50/30">
                            <span className="text-sm text-gray-500 font-light">
                                {row.before}
                            </span>
                        </div>
                        <div className="col-span-4 px-6 py-5 bg-luxury-gold/[0.03]">
                            <span className="text-sm text-gray-700 font-medium">
                                {row.after}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
