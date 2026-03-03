'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FaqItem } from "../types/product";

interface FaqAccordionProps {
    kicker: string;
    headline: string;
    items: FaqItem[];
}

function ChevronDown({ open }: { open: boolean }) {
    return (
        <svg
            className={`w-5 h-5 text-luxury-gold shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export function FaqAccordion({ kicker, headline, items }: FaqAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="px-6 pb-40 max-w-3xl mx-auto relative z-10">
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

            <div className="space-y-3">
                {items.map((item, idx) => {
                    const isOpen = openIndex === idx;
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", stiffness: 100, damping: 30, delay: idx * 0.06 }}
                            className={`rounded-2xl border transition-colors duration-300 overflow-hidden ${
                                isOpen
                                    ? 'border-luxury-gold/30 bg-white shadow-[0_4px_20px_rgba(212,175,55,0.08)]'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-1 self-stretch rounded-full shrink-0 transition-colors duration-300 ${
                                            isOpen ? 'bg-luxury-gold' : 'bg-transparent'
                                        }`}
                                    />
                                    <span className="text-sm md:text-base font-semibold text-gray-800 font-[family-name:var(--font-prompt)]">
                                        {item.question}
                                    </span>
                                </div>
                                <ChevronDown open={isOpen} />
                            </button>

                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        <div className="px-6 pb-6 pl-11">
                                            <p className="text-sm text-gray-500 font-light leading-relaxed">
                                                {item.answer}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
