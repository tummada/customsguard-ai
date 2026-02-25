'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth deceleration scroll — gives the page a precision-instrument feel.
 * Damping: 40 (gentle stop), Duration: 1.2s of momentum
 */
export function SmoothScroll() {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        return () => lenis.destroy();
    }, []);

    return null;
}
