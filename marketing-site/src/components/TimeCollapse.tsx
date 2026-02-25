'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
 * Animation cycle:
 *   1. Show "3 ชั่วโมง" (with strikethrough) for 1.4s after entering viewport
 *   2. Morph to "2 นาที" (gold shimmer)
 *   3. FREEZE for 8 seconds
 *   4. Soft fade reset back to "3 ชั่วโมง"
 *   5. Repeat from step 1
 */

const morphSpring = {
    type: "spring",
    stiffness: 100,
    damping: 40,
    mass: 0.8,
} as const;

const softFade = { duration: 0.6, ease: [0.4, 0, 0.2, 1] } as const;
const exitFade = { duration: 0.4, ease: [0.4, 0, 1, 1] } as const;

const textStyle: React.CSSProperties = {
    fontFamily: "var(--font-prompt), sans-serif",
    letterSpacing: "0",
    fontWeight: "700",
    fontSize: "1.25rem",
    lineHeight: "1.2",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
};

export function TimeCollapse() {
    const ref = useRef<HTMLSpanElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    // "before" = 3 ชั่วโมง, "after" = 2 นาที
    const [phase, setPhase] = useState<"before" | "after">("before");
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

    // Animation cycle controller
    const startCycle = useCallback(() => {
        // Step 1: Show "3 ชั่วโมง" for 1.4s, then switch to "2 นาที"
        timerRef.current = setTimeout(() => {
            setPhase("after");

            // Step 3: Freeze for 10s, then reset to "3 ชั่วโมง"
            timerRef.current = setTimeout(() => {
                setPhase("before");
            }, 10000);
        }, 1400);
    }, []);

    useEffect(() => {
        if (!isVisible) {
            // Reset when leaving viewport
            setPhase("before");
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }
        startCycle();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isVisible, startCycle]);

    // When phase resets to "before", restart the cycle
    useEffect(() => {
        if (isVisible && phase === "before") {
            // Small delay to let the fade-in of "3 ชั่วโมง" finish
            timerRef.current = setTimeout(() => {
                setPhase("after");

                timerRef.current = setTimeout(() => {
                    setPhase("before");
                }, 8000);
            }, 2000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // Only trigger on phase change while visible
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, isVisible]);

    return (
        <span
            ref={ref}
            style={{
                display: "inline-flex",
                alignItems: "baseline",
                position: "relative",
                margin: "0 0.2rem",
                verticalAlign: "baseline",
            }}
        >
            {/* Ghost — locks width to wider string */}
            <span
                aria-hidden="true"
                style={{
                    ...textStyle,
                    visibility: "hidden",
                    pointerEvents: "none",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                }}
            >
                3 ชั่วโมง
            </span>

            {/* Animated layer */}
            <span style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                <AnimatePresence mode="wait">
                    {phase === "before" ? (
                        <motion.span
                            key="before"
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.95, filter: "blur(3px)" }}
                            transition={softFade}
                            style={{
                                ...textStyle,
                                color: "#b0b0b0",
                                textDecoration: "line-through",
                                textDecorationColor: "rgba(212, 175, 55, 0.3)",
                                textDecorationThickness: "0.5px",
                            }}
                        >
                            3 ชั่วโมง
                        </motion.span>
                    ) : (
                        <motion.span
                            key="after"
                            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(3px)" }}
                            transition={morphSpring}
                            style={{
                                ...textStyle,
                                color: "#D4AF37",
                                textShadow: "0 0 12px rgba(212, 175, 55, 0.25)",
                            }}
                            className="time-gold-shimmer"
                        >
                            2 นาที
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </span>
    );
}
