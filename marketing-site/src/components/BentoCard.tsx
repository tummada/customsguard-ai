'use client';

import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { ReactNode, MouseEvent, useRef } from 'react';

interface BentoCardProps {
    children: ReactNode;
    className?: string;
    id?: string;
}

const hoverSpring = { type: "spring", stiffness: 200, damping: 30, mass: 1 } as const;

export const BentoCard = ({ children, className = "", id }: BentoCardProps) => {
    // Normalized mouse position (0→1) for spotlight
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);
    // Spotlight opacity — separate from position so we can fade it independently
    const spotOpacity = useMotionValue(0);

    const smoothX = useSpring(mouseX, { stiffness: 200, damping: 30 });
    const smoothY = useSpring(mouseY, { stiffness: 200, damping: 30 });

    // Spotlight gradient — only color, opacity controlled separately
    const spotBg = useTransform(
        [smoothX, smoothY],
        ([x, y]) =>
            `radial-gradient(circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(212, 175, 55, 0.20) 0%, transparent 45%)`
    );

    function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        mouseX.set((clientX - left) / width);
        mouseY.set((clientY - top) / height);
        // Fade spotlight in quickly on first entry
        animate(spotOpacity, 1, { duration: 0.2 });
    }

    function handleMouseLeave() {
        // Decelerating fade out — 0.8s ease-out so it dissolves gently (no abrupt cut)
        animate(spotOpacity, 0, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
        mouseX.set(0.5);
        mouseY.set(0.5);
    }

    return (
        <motion.div
            id={id}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`bento-card ${className}`}
            // 3D only on hover — zero GPU cost at rest
            whileHover={{ rotateX: 1.2, rotateY: -1.2, z: 6 }}
            transition={hoverSpring}
            style={{ position: "relative" }}
        >
            {/* Spotlight overlay — fades in/out independently from position */}
            <motion.div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    background: spotBg,
                    opacity: spotOpacity,
                    pointerEvents: "none",
                    borderRadius: "2rem",
                    zIndex: 0,
                }}
            />
            {/* Content always above spotlight */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", flex: 1, alignItems: "inherit", justifyContent: "inherit" }}>
                {children}
            </div>
        </motion.div>
    );
};
