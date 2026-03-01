'use client';

import { useActionState, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitLead } from "@/app/actions";
import { ArrowIcon, SparklesIcon, TagIcon, MessageIcon } from "@/components/Icons";

type FormState =
    | { success: false; errors?: Record<string, string[]>; message?: string }
    | { success: true; message: string };

const initialState: FormState = { success: false };

const luxurySpring = { type: 'spring', stiffness: 100, damping: 40, mass: 1.5 } as const;

const inputClass =
    "w-full bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl pl-12 pr-6 py-5 text-base shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] focus:outline-none focus:border-luxury-gold/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1),inset_0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-300 font-light placeholder:text-gray-400";

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

export function LeadForm({ productCategory = 'Unknown Product' }: { productCategory?: string }) {
    const [state, action, isPending] = useActionState<FormState, FormData>(
        async (prevState, formData) => {
            // Final validation before actual action
            const newErrors: Record<string, string> = {};
            const data = Object.fromEntries(formData);

            if (!data.name) newErrors.name = "กรุณาระบุข้อมูลในช่องนี้";
            if (!data.company) newErrors.company = "กรุณาระบุข้อมูลในช่องนี้";

            const email = data.email as string;
            if (!email) {
                newErrors.email = "กรุณาระบุข้อมูลในช่องนี้";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                newErrors.email = "กรุณาระบุรูปแบบอีเมลที่ถูกต้อง";
            }

            const phone = data.phone as string;
            if (!phone) {
                newErrors.phone = "กรุณาระบุข้อมูลในช่องนี้";
            } else if (!/^[0-9]{10}$/.test(phone)) {
                newErrors.phone = "กรุณาระบุเบอร์โทรศัพท์ 10 หลัก (เช่น 081xxxxxxx)";
            }

            if (!data.category) newErrors.category = "กรุณาเลือกประเภทธุรกิจ";

            if (Object.keys(newErrors).length > 0) {
                setFieldErrors(newErrors);
                return { success: false } as FormState;
            }

            const result = await submitLead(prevState, formData);
            return result as FormState;
        },
        initialState
    );

    /* ── Custom Field Validation State ── */
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [btnHovered, setBtnHovered] = useState(false);

    const handleInput = (name: string) => {
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleBlur = (name: string, value: string, type?: string) => {
        let error = "";
        if (!value) {
            error = "กรุณาระบุข้อมูลในช่องนี้";
        } else if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = "กรุณาระบุรูปแบบอีเมลที่ถูกต้อง";
        } else if (name === "phone" && !/^[0-9]{10}$/.test(value)) {
            error = "กรุณาระบุเบอร์โทรศัพท์ 10 หลัก (เช่น 081xxxxxxx)";
        }

        setFieldErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const ErrorMsg = ({ error }: { error?: string }) => (
        <AnimatePresence>
            {error && (
                <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[11px] text-[#E57373] font-medium mt-1 ml-4 block"
                >
                    {error}
                </motion.span>
            )}
        </AnimatePresence>
    );

    /* ── Custom dropdown state ── */
    const [catOpen, setCatOpen] = useState(false);
    const [catValue, setCatValue] = useState("");
    const catLabel = categories.find((c) => c.value === catValue)?.label ?? "";
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const benefits = [
        {
            icon: <SparklesIcon />,
            text: "สิทธิ์เข้าใช้งานรุ่น Beta ก่อนใคร (เริ่ม มี.ค. 2026)"
        },
        {
            icon: <TagIcon />,
            text: "จำกัด 10 บริษัทแรก — รับส่วนลด 50% ตลอดชีพ"
        },
        {
            icon: <MessageIcon />,
            text: "ร่วมออกแบบฟีเจอร์ AI ให้เข้ากับธุรกิจท่านที่สุด"
        }
    ];

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
                <h3 className="text-2xl font-bold mb-3 tracking-tighter">ลงทะเบียนจองสิทธิ์เรียบร้อยแล้ว</h3>
                <p className="text-[#D4AF37] text-sm font-medium mt-2 leading-relaxed max-w-xs px-4">
                    ทีมงานจะติดต่อกลับเพื่อยืนยันสิทธิ์ภายใน 48 ชม.
                </p>
            </motion.div>
        );
    }

    const getBorderClass = (name: string) => {
        return fieldErrors[name]
            ? "border-[#E57373]/50 focus:border-[#E57373] focus:shadow-[0_0_0_3px_rgba(229,115,115,0.1),inset_0_1px_3px_rgba(0,0,0,0.04)]"
            : "border-gray-200/50 focus:border-luxury-gold/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1),inset_0_1px_3px_rgba(0,0,0,0.04)]";
    };

    return (
        <form action={action} noValidate className="flex flex-col h-full justify-between p-4 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {/* Left Column: Value Proposition */}
                <div className="flex flex-col justify-center">
                    <div className="mb-8">
                        {/* Gold Seal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ ...luxurySpring, delay: 0.05 }}
                            className="mb-6"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://placehold.co/100x100/D4AF37/FFF?text=Gold+Seal"
                                alt="Founder's Club Gold Seal"
                                className="w-20 h-20 rounded-full shadow-[0_0_24px_rgba(212,175,55,0.35)]"
                            />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 bg-luxury-gold/5 border border-luxury-gold/20 rounded-full px-4 py-1.5 mb-8"
                        >
                            <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full" />
                            <span className="text-[10px] font-bold text-luxury-gold tracking-tight uppercase font-[family-name:var(--font-inter)]">
                                EARLY ACCESS & LIFETIME PRIVILEGE
                            </span>
                        </motion.div>
                        <h3 className="text-3xl lg:text-5xl font-light mb-6 tracking-tight leading-tight">
                            จองสิทธิ์<br />
                            <span className="font-bold font-[family-name:var(--font-inter)] uppercase">Founder&apos;s Club</span>
                        </h3>
                        <p className="text-gray-400 text-sm lg:text-[15px] font-normal leading-relaxed mb-10 max-w-md">
                            เราไม่ได้แค่สร้าง Software แต่เรากำลังคัดเลือกพาร์ทเนอร์เพื่อกำหนดมาตรฐานใหม่ของชิปปิ้งไทย
                        </p>
                    </div>

                    {/* "Why Join?" Bullets */}
                    <div className="space-y-8">
                        <p className="text-[11px] font-bold text-gray-300 tracking-tight uppercase mb-4 font-[family-name:var(--font-inter)]">Why Join?</p>
                        {benefits.map((b, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + (i * 0.1) }}
                                className="flex items-start gap-5"
                            >
                                <div className="mt-0.5 shrink-0 opacity-90 scale-100 origin-top-left">
                                    {b.icon}
                                </div>
                                <p className="text-sm lg:text-[16px] font-medium text-gray-600 leading-snug">
                                    {b.text}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Urgency badge (Mobile Only) */}
                    <div className="mt-12 flex lg:hidden flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-bold tracking-tight uppercase text-gray-500 font-[family-name:var(--font-inter)]">
                            <span>BATCH 01 INTAKE</span>
                            <span className="text-luxury-gold">8/10 SLOTS RESERVED</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-luxury-gold/30 rounded-full" style={{ width: '80%' }} />
                        </div>
                    </div>
                </div>

                {/* Right Column: The Form */}
                <div className="relative">
                    {/* Desktop Urgency Badge */}
                    <div className="hidden lg:flex flex-col gap-2 mb-8">
                        <div className="flex justify-between items-center text-[10px] font-bold tracking-tight uppercase text-gray-500 font-[family-name:var(--font-inter)]">
                            <span>BATCH 01 INTAKE</span>
                            <span className="text-luxury-gold">8/10 SLOTS RESERVED</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-luxury-gold/30 rounded-full" style={{ width: '80%' }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="relative">
                            <UserSvg />
                            <input
                                type="text"
                                name="name"
                                placeholder="ชื่อ-นามสกุล"
                                className={`${inputClass} ${getBorderClass("name")}`}
                                onBlur={(e) => handleBlur("name", e.target.value)}
                                onInput={() => handleInput("name")}
                            />
                            <ErrorMsg error={fieldErrors.name} />
                        </div>

                        {/* Company */}
                        <div className="relative">
                            <BuildingSvg />
                            <input
                                type="text"
                                name="company"
                                placeholder="ชื่อบริษัท"
                                className={`${inputClass} ${getBorderClass("company")}`}
                                onBlur={(e) => handleBlur("company", e.target.value)}
                                onInput={() => handleInput("company")}
                            />
                            <ErrorMsg error={fieldErrors.company} />
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <MailSvg />
                            <input
                                type="email"
                                name="email"
                                placeholder="อีเมลธุรกิจ"
                                className={`${inputClass} ${getBorderClass("email")}`}
                                onBlur={(e) => handleBlur("email", e.target.value, "email")}
                                onInput={() => handleInput("email")}
                            />
                            <ErrorMsg error={fieldErrors.email} />
                        </div>

                        {/* Phone — pattern validates 10-digit Thai number */}
                        <div className="relative">
                            <PhoneSvg />
                            <input
                                type="tel"
                                name="phone"
                                placeholder="เบอร์โทรศัพท์ (10 หลัก)"
                                className={`${inputClass} ${getBorderClass("phone")}`}
                                onBlur={(e) => handleBlur("phone", e.target.value)}
                                onInput={() => handleInput("phone")}
                            />
                            <ErrorMsg error={fieldErrors.phone} />
                        </div>

                        {/* ── Custom Category Dropdown ── */}
                        <div className="relative col-span-2" ref={dropdownRef}>
                            <input type="hidden" name="category" value={catValue} />
                            <BoxSvg />
                            <ChevronSvg open={catOpen} />

                            <button
                                type="button"
                                onClick={() => setCatOpen((v) => !v)}
                                className={`w-full bg-white/50 backdrop-blur-sm border rounded-2xl pl-12 pr-10 py-5 text-base text-left shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-300 font-light cursor-pointer
                                ${catOpen
                                        ? "border-luxury-gold/40 shadow-[0_0_0_3px_rgba(212,175,55,0.1),inset_0_2px_6px_rgba(0,0,0,0.06)]"
                                        : fieldErrors.category
                                            ? "border-[#E57373]/50 shadow-[0_0_0_3px_rgba(229,115,115,0.05)]"
                                            : "border-gray-200/50 hover:border-gray-300/60"
                                    }
                                ${catValue ? "text-black" : "text-gray-400"}`}
                            >
                                {catLabel || "ประเภทธุรกิจ"}
                            </button>
                            <ErrorMsg error={fieldErrors.category} />

                            <input type="hidden" name="product_category" value={productCategory} />

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
                                                        handleInput("category");
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

                    <div className="mt-6">
                        <motion.div
                            animate={{ x: [0, -4, 4, -4, 4, -2, 2, 0] }}
                            transition={{ repeat: Infinity, repeatDelay: 4.5, duration: 0.5 }}
                        >
                            <motion.button
                                type="submit"
                                disabled={isPending || !ready}
                                onHoverStart={() => setBtnHovered(true)}
                                onHoverEnd={() => setBtnHovered(false)}
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.96 }}
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
                                className="group vault-morph relative overflow-hidden w-full text-white font-bold px-6 py-5 rounded-2xl disabled:opacity-50"
                            >
                                {isPending ? (
                                    <span className="flex items-center justify-center gap-3">กำลังดำเนินการ...</span>
                                ) : (
                                    <>
                                        <span className="relative z-10 flex items-center justify-center gap-3 group-hover:-translate-y-[150%] group-hover:opacity-0 transition-all duration-500">
                                            จองสิทธิ์ Founder&apos;s Club
                                            <motion.span
                                                animate={{ x: btnHovered ? 0 : [0, 4, 0] }}
                                                transition={{ repeat: btnHovered ? 0 : Infinity, duration: 2, ease: "easeInOut" }}
                                            >
                                                <ArrowIcon />
                                            </motion.span>
                                        </span>
                                        <span className="absolute inset-0 z-10 flex items-center justify-center translate-y-[150%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 font-bold tracking-tight">
                                            ENTER THE VAULT
                                        </span>
                                    </>
                                )}
                            </motion.button>
                        </motion.div>

                        <p className="text-[9px] text-gray-500 font-medium tracking-wide mt-4 text-center">
                            🛡️ ข้อมูล Invoice ของคุณถูกประมวลผลในระบบปิด ไม่มีการรั่วไหลสู่ AI สาธารณะ 100%
                        </p>

                        {!state.success && (state.message || state.errors) && (
                            <div className="mt-4 px-4 text-center">
                                <p className="text-[#E57373] text-[10px] font-medium uppercase tracking-widest leading-relaxed">
                                    {state.message || "ขออภัย ระบบขัดข้องชั่วคราว กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง"}
                                </p>
                                {state.errors && Object.keys(state.errors).length > 0 && (
                                    <ul className="mt-1 list-none">
                                        {Object.values(state.errors).flat().map((err, i) => (
                                            <li key={i} className="text-[#E57373] text-[9px] font-medium opacity-80 uppercase tracking-tighter italic">
                                                * {err}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
