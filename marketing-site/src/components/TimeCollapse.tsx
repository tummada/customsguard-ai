'use client';

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
 * Animation cycle:
 *   1. Show "3 ชั่วโมง" (Prompt 300, gray, strikethrough) for 1.4s after entering viewport
 *   2. Cross-fade (0.6s) to "2 นาที" (Instrument Serif 700, gold shimmer + glow)
 *   3. FREEZE for 10 seconds (first cycle) / 8 seconds (subsequent)
 *   4. Soft cross-fade back to "3 ชั่วโมง"
 *   5. Repeat (2s pause on "before" before next cycle)
 *
 * Zero-Shift Layout:
 *   - Outer: `inline-flex items-baseline relative mx-2` — in-flow, baseline-aligned
 *   - Ghost ("3 ชั่วโมง") stays in flow to hold the container's width
 *   - Live text is `position: absolute, inset: 0` — no layout reflow, no surrounding text shift
 *
 * Baseline Guard:
 *   - `alignItems: "baseline"` on the live-text wrapper aligns text baselines
 *   - Static `y: "0.04em"` on "2 นาที" calibrates Instrument Serif vs Thai font baseline
 */

const fade = { duration: 0.6, ease: [0.4, 0, 0.2, 1] } as const;

export function TimeCollapse() {
    const ref = useRef<HTMLSpanElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [phase, setPhase] = useState<"before" | "after">("before");
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const isFirstCycle = useRef(true);

    // Observe viewport entry
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setIsVisible(true);
                else setIsVisible(false);
            },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    // Single effect drives the entire cycle — no dual-timer race condition
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!isVisible) {
            setPhase("before");
            isFirstCycle.current = true;
            return;
        }

        if (phase === "before") {
            timerRef.current = setTimeout(() => setPhase("after"), 3000);
        } else {
            isFirstCycle.current = false;
            timerRef.current = setTimeout(() => setPhase("before"), 3000);
        }

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isVisible, phase]);

    return (
        <span
            ref={ref}
            className="inline-flex items-baseline relative mx-2"
            style={{ verticalAlign: "baseline", transform: "translateY(1.5px)" }}
        >
            {/*
             * Ghost — Prompt 300, always invisible but in flow.
             * Sets the container width so surrounding Thai text never shifts.
             */}
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
                3&nbsp;ชั่วโมง
            </span>

            {/*
             * Live text — absolutely covers the ghost.
             * `alignItems: "baseline"` keeps the animated text on the same
             * baseline as the ghost, which aligns with the surrounding h1.
             */}
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
                    {phase === "before" ? (
                        /*
                         * "3 ชั่วโมง" — Prompt 300, muted gray, struck through.
                         * Represents the old painful reality.
                         */
                        <motion.span
                            key="before"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={fade}
                            style={{
                                fontFamily: "var(--font-prompt), sans-serif",
                                fontWeight: 300,
                                color: "#9ca3af",
                                textDecoration: "line-through",
                                textDecorationColor: "#9ca3af",
                                textDecorationThickness: "1px",
                                whiteSpace: "nowrap",
                                willChange: "opacity",
                            }}
                        >
                            3&nbsp;ชั่วโมง
                        </motion.span>
                    ) : (
                        /*
                         * "2 นาที" — Instrument Serif 700, gold shimmer + glow.
                         * Represents the precision outcome — premium vs the thin Prompt.
                         *
                         * Baseline Guard: `y: "0.04em"` shifts Instrument Serif's visual
                         * baseline to match surrounding Thai type. Tune if fonts change.
                         */
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
                                fontWeight: 700,
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
