'use client';

import { useActionState, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitLead } from "@/app/actions";
import { ArrowIcon } from "@/components/Icons";

type FormState =
    | { success: false; errors?: Record<string, string[]>; message?: string }
    | { success: true; message: string };

const initialState: FormState = { success: false };

const luxurySpring = { type: 'spring', stiffness: 100, damping: 40, mass: 1.5 } as const;

const inputClass =
    "w-full bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl pl-12 pr-6 py-4 text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] focus:outline-none focus:border-luxury-gold/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1),inset_0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 font-light placeholder:text-gray-400";

/* Tiny inline SVG icons — 16×16, 1.5px stroke, gold */
const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-gold pointer-events-none";

const UserSvg = () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

const BuildingSvg = () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01" />
    </svg>
);

const MailSvg = () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
);

const PhoneSvg = () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const BoxSvg = () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);

/* Chevron arrow — rotates when dropdown is open */
const ChevronSvg = ({ open }: { open: boolean }) => (
    <svg
        className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const categories = [
    { value: "electronics", label: "Electronics" },
    { value: "fashion", label: "Fashion" },
    { value: "food_beverage", label: "Food & Beverage" },
    { value: "industrial", label: "Industrial Parts" },
    { value: "others", label: "Others" },
];

export function LeadForm() {
    const [state, action, isPending] = useActionState<FormState, FormData>(
        async (prevState, formData) => {
            const result = await submitLead(prevState, formData);
            return result as FormState;
        },
        initialState
    );

    /* ── Custom dropdown state ── */
    const [catOpen, setCatOpen] = useState(false);
    const [catValue, setCatValue] = useState("");
    const catLabel = categories.find((c) => c.value === catValue)?.label ?? "";
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* ── Vault-morph hover text state ── */
    const [btnHover, setBtnHover] = useState(false);

    /* ── Spam protection: disable submit for 2s after mount ── */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setReady(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setCatOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (state.success) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={luxurySpring}
                className="h-full flex flex-col items-center justify-center text-center p-8"
            >
                <div className="w-16 h-16 bg-luxury-gold/10 rounded-full flex items-center justify-center mb-6">
                    <ArrowIcon />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tighter">สำเร็จแล้ว!</h3>
                <p className="text-gray-400 text-sm font-light mt-2 leading-relaxed max-w-xs">
                    ขอบคุณที่ร่วมเป็นส่วนหนึ่งของสถาปนิกแห่งเวลา เราจะติดต่อกลับเพื่อยืนยันสิทธิ์ Beta ของคุณเร็วๆ นี้
                </p>
            </motion.div>
        );
    }

    return (
        <form action={action} className="flex flex-col h-full justify-between p-2">
            <div>
                <h3 className="text-3xl font-bold mb-2 tracking-tighter">Founder&apos;s Club</h3>
                <p className="text-luxury-gold text-xs font-bold tracking-wide uppercase mb-4">
                    Beta Testing — เปิดรับเพียง 10 บริษัท
                </p>

                {/* Urgency badge */}
                <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="inline-flex items-center gap-2 bg-red-50 border border-red-200/60 rounded-full px-4 py-1.5 mb-4"
                >
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[11px] font-bold text-red-600 tracking-wide">
                        เหลือเพียง 4 สิทธิ์สุดท้ายสำหรับสิทธิพิเศษตลอดชีพ
                    </span>
                </motion.div>

                <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
                    สมัครรอบแรกเพื่อทดลองใช้ VOLLOS AI ก่อนใคร พร้อมสิทธิพิเศษตลอดชีพ
                </p>

                {/* Honeypot — hidden from humans, traps bots */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Name */}
                    <div className="relative">
                        <UserSvg />
                        <input type="text" name="name" required placeholder="ชื่อ-นามสกุล" className={inputClass} />
                    </div>

                    {/* Company */}
                    <div className="relative">
                        <BuildingSvg />
                        <input type="text" name="company" required placeholder="ชื่อบริษัท" className={inputClass} />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <MailSvg />
                        <input type="email" name="email" required placeholder="อีเมลธุรกิจ" className={inputClass} />
                    </div>

                    {/* Phone — pattern validates 10-digit Thai number */}
                    <div className="relative">
                        <PhoneSvg />
                        <input
                            type="tel"
                            name="phone"
                            required
                            pattern="[0-9]{10}"
                            title="กรุณากรอกเบอร์โทร 10 หลัก"
                            placeholder="เบอร์โทรศัพท์"
                            className={inputClass}
                        />
                    </div>

                    {/* ── Custom Category Dropdown ── */}
                    <div className="relative col-span-2" ref={dropdownRef}>
                        <input type="hidden" name="category" value={catValue} />
                        <BoxSvg />
                        <ChevronSvg open={catOpen} />

                        <button
                            type="button"
                            onClick={() => setCatOpen((v) => !v)}
                            className={`w-full bg-white/50 backdrop-blur-sm border rounded-2xl pl-12 pr-10 py-4 text-sm text-left shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 font-light cursor-pointer
                                ${catOpen
                                    ? "border-luxury-gold/40 shadow-[0_0_0_3px_rgba(212,175,55,0.1),inset_0_1px_3px_rgba(0,0,0,0.04)]"
                                    : "border-gray-200/50 hover:border-gray-300/60"
                                }
                                ${catValue ? "text-black" : "text-gray-400"}`}
                        >
                            {catLabel || "ประเภทธุรกิจ"}
                        </button>

                        <AnimatePresence>
                            {catOpen && (
                                <motion.ul
                                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                    className="absolute z-50 top-full mt-2 left-0 right-0 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-[0_8px_30px_rgba(212,175,55,0.12)] overflow-hidden py-1"
                                >
                                    {categories.map((cat) => (
                                        <li key={cat.value}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCatValue(cat.value);
                                                    setCatOpen(false);
                                                }}
                                                className={`w-full text-left px-5 py-3 text-sm transition-all duration-150 cursor-pointer
                                                    ${catValue === cat.value
                                                        ? "bg-luxury-gold/10 text-luxury-gold font-medium"
                                                        : "text-gray-600 hover:bg-luxury-gold/10 hover:text-black font-medium"
                                                    }`}
                                            >
                                                {cat.label}
                                            </button>
                                        </li>
                                    ))}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <motion.button
                    type="submit"
                    disabled={isPending || !ready}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.96 }}
                    onMouseEnter={() => setBtnHover(true)}
                    onMouseLeave={() => setBtnHover(false)}
                    animate={{
                        boxShadow: [
                            "0 0 0px rgba(212, 175, 55, 0)",
                            "0 0 20px rgba(212, 175, 55, 0.4)",
                            "0 0 0px rgba(212, 175, 55, 0)",
                        ],
                    }}
                    transition={{
                        boxShadow: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
                        scale: luxurySpring,
                    }}
                    className="vault-morph w-full text-white font-bold px-6 py-5 rounded-2xl flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                    <span
                        className="relative z-10 transition-all duration-500"
                        style={{ letterSpacing: btnHover ? '0.15em' : '0em' }}
                    >
                        {isPending ? "กำลังส่ง..." : btnHover ? "Enter the Vault" : "สมัคร Founder's Club"}
                    </span>
                    <motion.span
                        className="relative z-10"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                        <ArrowIcon />
                    </motion.span>
                </motion.button>

                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-4 text-center opacity-60">
                    ข้อมูลเข้ารหัสด้วย RS256 & RLS
                </p>

                {!state.success && state.message && (
                    <p className="text-red-500 text-[10px] mt-4 font-bold uppercase tracking-widest text-center">
                        {state.message}
                    </p>
                )}
            </div>
        </form>
    );
}
