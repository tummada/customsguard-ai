'use client';

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
 * Strikethrough Morph Animation:
 *   1. Show "3 ชม." in muted gray (#b0b0b0)
 *   2. Animate a thin (0.5px) golden strikethrough line left → right
 *   3. Crossfade to "2 นาที" in gold (Instrument Serif) with glow
 *   4. Hold for 10s, then smoothly reset and loop
 *
 * Zero-Shift Layout:
 *   - Ghost text holds container width in flow
 *   - Live text is absolutely positioned — no surrounding text shift
 */

const fade = { duration: 0.6, ease: [0.4, 0, 0.2, 1] } as const;

export function TimeCollapse() {
    const ref = useRef<HTMLSpanElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [phase, setPhase] = useState<"before" | "striking" | "after">("before");
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setIsVisible(true);
                else setIsVisible(false);
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!isVisible) {
            setPhase("before");
            return;
        }

        if (phase === "before") {
            // Show "3 ชม." in gray, then start strikethrough
            timerRef.current = setTimeout(() => setPhase("striking"), 3000);
        } else if (phase === "striking") {
            // Strikethrough line animates (0.8s CSS), wait 1s total then morph
            timerRef.current = setTimeout(() => setPhase("after"), 1000);
        } else {
            // Hold "2 นาที" for 10s, then smooth reset
            timerRef.current = setTimeout(() => setPhase("before"), 10000);
        }

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isVisible, phase]);

    return (
        <span
            ref={ref}
            className="inline-flex items-baseline relative mx-2"
            style={{ verticalAlign: "baseline", transform: "translateY(1.5px)" }}
        >
            {/* Ghost — Prompt 300, invisible but in flow to hold width */}
            <span
                aria-hidden="true"
                style={{
                    fontFamily: "var(--font-prompt), sans-serif",
                    fontWeight: 300,
                    whiteSpace: "nowrap",
                    visibility: "hidden",
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                3&nbsp;ชม.
            </span>

            {/* Live text — absolutely covers the ghost */}
            <span
                aria-live="polite"
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                }}
            >
                <AnimatePresence mode="wait">
                    {phase !== "after" ? (
                        <motion.span
                            key="before"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={fade}
                            style={{
                                fontFamily: "var(--font-prompt), sans-serif",
                                fontWeight: 300,
                                color: "#b0b0b0",
                                whiteSpace: "nowrap",
                                willChange: "opacity",
                                position: "relative",
                                display: "inline-block",
                            }}
                        >
                            3&nbsp;ชม.
                            {/* Golden strikethrough line — animates left to right */}
                            <span
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: "50%",
                                    height: "0.5px",
                                    width: "100%",
                                    background: "linear-gradient(90deg, #D4AF37 0%, #e6c27a 100%)",
                                    transform: phase === "striking" ? "scaleX(1)" : "scaleX(0)",
                                    transformOrigin: "left center",
                                    transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                    pointerEvents: "none",
                                }}
                            />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="after"
                            className="time-gold-shimmer"
                            initial={{
                                opacity: 0,
                                scale: 0.97,
                                y: "0.04em",
                                filter: "blur(4px) drop-shadow(0 0 0px rgba(212,175,55,0)) drop-shadow(0 0 0px rgba(212,175,55,0))",
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: "0.04em",
                                filter: "blur(0px) drop-shadow(0 0 10px rgba(212,175,55,0.55)) drop-shadow(0 0 20px rgba(212,175,55,0.3))",
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.97,
                                y: "0.04em",
                                filter: "blur(3px) drop-shadow(0 0 0px rgba(212,175,55,0)) drop-shadow(0 0 0px rgba(212,175,55,0))",
                            }}
                            transition={fade}
                            style={{
                                fontFamily: 'var(--font-instrument), "Instrument Serif", serif',
                                fontWeight: 400,
                                whiteSpace: "nowrap",
                                willChange: "opacity, transform, filter",
                            }}
                        >
                            2&nbsp;นาที
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </span>
    );
}
