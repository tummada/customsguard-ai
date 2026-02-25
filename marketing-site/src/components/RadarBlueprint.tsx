'use client';

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const cursorSpring = { stiffness: 120, damping: 28, mass: 1 };

export function RadarBlueprint() {
    const rawX = useMotionValue(-2000);
    const rawY = useMotionValue(-2000);

    const x = useSpring(rawX, cursorSpring);
    const y = useSpring(rawY, cursorSpring);

    // Layer 1: Gold glow that follows mouse (subtle ambient)
    const glowBg = useTransform(
        [x, y],
        ([px, py]) =>
            `radial-gradient(circle 320px at ${px}px ${py}px, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 50%, transparent 80%)`
    );

    // Layer 2: mask-image for the high-brightness blueprint grid reveal
    const maskImage = useTransform(
        [x, y],
        ([px, py]) =>
            `radial-gradient(circle 250px at ${px}px ${py}px, black 0%, transparent 75%)`
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            rawX.set(e.clientX);
            rawY.set(e.clientY);
        };
        window.addEventListener("mousemove", handler, { passive: true });
        return () => window.removeEventListener("mousemove", handler);
    }, [rawX, rawY]);

    return (
        <>
            {/* Ambient gold glow following cursor */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-0"
                style={{ background: glowBg }}
                aria-hidden="true"
            />
            {/* Blueprint grid that lights up where the mouse is */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(212, 175, 55, 0.15) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0.5px, transparent 0.5px)",
                    backgroundSize: "40px 40px",
                    WebkitMaskImage: maskImage,
                    maskImage: maskImage,
                }}
                aria-hidden="true"
            />
        </>
    );
}
