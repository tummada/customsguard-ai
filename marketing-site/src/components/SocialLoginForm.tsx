'use client';

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { saveSocialLead } from "@/app/actions";
import { ArrowIcon, SparklesIcon, TagIcon, MessageIcon } from "@/components/Icons";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
                };
            };
        };
    }
}

const luxurySpring = { type: 'spring', stiffness: 100, damping: 40, mass: 1.5 } as const;

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

/* LINE logo inline SVG */
const LineLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
);

export function SocialLoginForm() {
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const googleBtnRef = useRef<HTMLDivElement>(null);
    const gsiInitialized = useRef(false);

    // Check if returning from LINE OAuth
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('registered') === 'true') {
            setRegistered(true);
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('error')) {
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Load Google Identity Services
    useEffect(() => {
        if (gsiInitialized.current) return;
        if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (!window.google || !googleBtnRef.current) return;
            gsiInitialized.current = true;

            window.google.accounts.id.initialize({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                callback: async (response: { credential: string }) => {
                    setLoading(true);
                    setError('');
                    try {
                        const result = await saveSocialLead('google', response.credential);
                        if (result.success) {
                            setRegistered(true);
                        } else {
                            setError(result.message || 'เกิดข้อผิดพลาด');
                        }
                    } catch {
                        setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
                    } finally {
                        setLoading(false);
                    }
                },
            });

            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'outline',
                size: 'large',
                width: 320,
                text: 'signup_with',
                shape: 'pill',
                locale: 'th',
            });
        };
        document.head.appendChild(script);
    }, []);

    const hasGoogleId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const hasLineId = !!process.env.NEXT_PUBLIC_LINE_CLIENT_ID;

    const handleLineLogin = () => {
        const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
        if (!clientId) {
            setError('ระบบ LINE Login ยังไม่พร้อมใช้งาน กรุณาใช้ Google หรือติดต่อทีมงาน');
            return;
        }

        const redirectUri = encodeURIComponent(
            `${window.location.origin}/api/auth/callback/line`
        );
        const state = crypto.randomUUID();

        window.location.href =
            `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid%20email`;
    };

    if (registered) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={luxurySpring}
                className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]"
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

    return (
        <div className="flex flex-col h-full justify-between p-4 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {/* Left Column: Value Proposition */}
                <div className="flex flex-col justify-center">
                    <div className="mb-8">
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

                    {/* Benefits */}
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
                                <div className="mt-0.5 shrink-0 opacity-90">{b.icon}</div>
                                <p className="text-sm lg:text-[16px] font-medium text-gray-600 leading-snug">{b.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Social Login Buttons */}
                <div className="relative flex flex-col justify-center">
                    {/* Urgency Badge */}
                    <div className="flex flex-col gap-2 mb-10">
                        <div className="flex justify-between items-center text-[10px] font-bold tracking-tight uppercase text-gray-500 font-[family-name:var(--font-inter)]">
                            <span>BATCH 01 INTAKE</span>
                            <span className="text-luxury-gold">8/10 SLOTS RESERVED</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-luxury-gold/30 rounded-full" style={{ width: '80%' }} />
                        </div>
                        <p className="text-[11px] font-bold text-center text-red-500 mt-2 tracking-tight">
                            ปิดรับรอบแรก 31 มี.ค. 2026 — เหลือเพียง 2 สิทธิ์สุดท้าย
                        </p>
                    </div>

                    <p className="text-center text-lg font-semibold mb-8 tracking-tight">
                        จองสิทธิ์ใน 1 คลิก
                    </p>

                    {/* Google Sign-In Button */}
                    <div className="flex justify-center mb-6">
                        {hasGoogleId ? (
                            <div ref={googleBtnRef} className="min-h-[44px]" />
                        ) : (
                            <button
                                disabled
                                className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-400 font-medium py-3 px-6 rounded-full cursor-not-allowed"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#9CA3AF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#9CA3AF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#9CA3AF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#9CA3AF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                Google (เร็วๆ นี้)
                            </button>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">หรือ</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* LINE Login Button */}
                    <motion.button
                        onClick={handleLineLogin}
                        disabled={loading}
                        whileHover={hasLineId ? { scale: 0.98 } : undefined}
                        whileTap={hasLineId ? { scale: 0.96 } : undefined}
                        className={`w-full max-w-[320px] mx-auto flex items-center justify-center gap-3 font-bold py-3 px-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                            hasLineId
                                ? "bg-[#06C755] hover:bg-[#05b34c] text-white cursor-pointer"
                                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        }`}
                    >
                        {hasLineId ? <LineLogo /> : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#9CA3AF">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                        )}
                        <span className="text-sm">{hasLineId ? "จองสิทธิ์ด้วย LINE" : "LINE (เร็วๆ นี้)"}</span>
                    </motion.button>

                    {/* Error message */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-[#E57373] text-xs font-medium mt-4"
                        >
                            {error}
                        </motion.p>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <p className="text-center text-gray-400 text-xs font-medium mt-4">
                            กำลังดำเนินการ...
                        </p>
                    )}

                    {/* Privacy note */}
                    <div className="mt-8 text-center">
                        <p className="text-[9px] text-gray-500 font-medium tracking-wide">
                            เราเก็บเฉพาะชื่อและอีเมลจาก Google/LINE เท่านั้น
                        </p>
                        <a
                            href="/privacy"
                            target="_blank"
                            className="text-[9px] text-luxury-gold hover:underline font-medium tracking-wide"
                        >
                            นโยบายความเป็นส่วนตัว
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
