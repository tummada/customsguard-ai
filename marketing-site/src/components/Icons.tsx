import React from 'react';

/* ── Blueprint-style icons ──
 * Raw SVG paths — no backgrounds, no fills
 * stroke="#D4AF37", strokeWidth="0.75", fill="none"
 * Like technical instrument drawings */

export const CustomIcon = ({ children }: { children: React.ReactNode }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="#D4AF37"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-8 h-8"
    >
        {children}
    </svg>
);

export const TargetIcon = () => (
    <CustomIcon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="3" />
        <circle cx="12" cy="11" r="1.5" />
    </CustomIcon>
);

export const ShieldIcon = () => (
    <CustomIcon>
        <path d="M12 2v20M21 12H3" />
        <circle cx="12" cy="12" r="9" />
        <path d="M18.36 5.64l-12.72 12.72M5.64 5.64l12.72 12.72" />
    </CustomIcon>
);

export const ZapIcon = () => (
    <CustomIcon>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </CustomIcon>
);

export const ArrowIcon = () => (
    <CustomIcon>
        <path d="M5 12h14m-7-7l7 7-7 7" />
    </CustomIcon>
);

export const UploadIcon = () => (
    <CustomIcon>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </CustomIcon>
);

export const SearchAIIcon = () => (
    <CustomIcon>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 8v6M8 11h6" />
    </CustomIcon>
);

export const SparklesIcon = () => (
    <CustomIcon>
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75L18 14z" />
        <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
    </CustomIcon>
);
