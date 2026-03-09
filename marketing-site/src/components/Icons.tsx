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

export const TagIcon = () => (
    <CustomIcon>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </CustomIcon>
);

export const MessageIcon = () => (
    <CustomIcon>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </CustomIcon>
);

export const EyeScanIcon = () => (
    <CustomIcon>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v-2M12 21v-2M5 12H3M21 12h-2" />
    </CustomIcon>
);

export const LayersIcon = () => (
    <CustomIcon>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
    </CustomIcon>
);

export const ClipboardCheckIcon = () => (
    <CustomIcon>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
    </CustomIcon>
);

export const MessageCircleIcon = () => (
    <CustomIcon>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </CustomIcon>
);

export const MenuIcon = () => (
    <CustomIcon>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </CustomIcon>
);

export const XIcon = () => (
    <CustomIcon>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </CustomIcon>
);

export const CheckIcon = () => (
    <CustomIcon>
        <polyline points="20 6 9 17 4 12" />
    </CustomIcon>
);

