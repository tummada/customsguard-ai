'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const luxurySpring = { type: 'spring', stiffness: 140, damping: 30, mass: 1 } as const;

interface NavLink {
    label: string;
    href: string;
}

interface NavbarProps {
    /** anchor links within the page (e.g. #roi, #features) */
    anchors?: NavLink[];
    /** CTA button text */
    ctaText?: string;
    /** CTA button link */
    ctaHref?: string;
}

/** Global links shown on every page (after anchors, before CTA) */
const globalLinks: NavLink[] = [
    { label: "ราคา", href: "/pricing" },
];

export function Navbar({ anchors = [], ctaText = "จองสิทธิ์ด่วน", ctaHref = "/c#waitlist" }: NavbarProps) {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    const allLinks = [...anchors, ...globalLinks];

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-xl border-b border-gray-100/30">
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href="/c">
                    <motion.div
                        className="pl-4"
                        whileHover={{ filter: "drop-shadow(0 0 12px rgba(212, 175, 55, 0.4))", scale: 1.02 }}
                        transition={luxurySpring}
                    >
                        <Image src="/images/logo.svg" alt="VOLLOS" width={550} height={518} className="h-14 w-auto object-contain" priority />
                    </motion.div>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-12 text-[13px] font-bold tracking-widest uppercase text-gray-500">
                    {allLinks.map((link) => (
                        link.href.startsWith('#') ? (
                            <motion.a
                                key={link.href}
                                whileHover={{ scale: 0.98 }}
                                transition={luxurySpring}
                                href={link.href}
                                className="hover:text-black transition"
                            >
                                {link.label}
                            </motion.a>
                        ) : (
                            <Link key={link.href} href={link.href} className="hover:text-black transition">
                                {link.label}
                            </Link>
                        )
                    ))}
                    <Link href={ctaHref} className="bg-black text-white px-8 py-3 rounded-full hover:bg-neutral-800 transition shadow-luxury">
                        {ctaText}
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 text-gray-500 hover:text-black transition"
                    onClick={() => setOpen(!open)}
                    aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        {open ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-t border-gray-100/30 bg-white/95 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex flex-col px-6 py-4 gap-3 text-[13px] font-bold tracking-widest uppercase text-gray-500">
                            {allLinks.map((link) => (
                                link.href.startsWith('#') ? (
                                    <a key={link.href} href={link.href} onClick={close} className="py-2 hover:text-black transition">
                                        {link.label}
                                    </a>
                                ) : (
                                    <Link key={link.href} href={link.href} onClick={close} className="py-2 hover:text-black transition">
                                        {link.label}
                                    </Link>
                                )
                            ))}
                            <Link href={ctaHref} onClick={close} className="bg-black text-white px-8 py-3 rounded-full hover:bg-neutral-800 transition shadow-luxury text-center mt-2">
                                {ctaText}
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
