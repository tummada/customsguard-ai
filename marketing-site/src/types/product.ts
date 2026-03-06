import { ReactNode } from "react";

export interface ProcessStep {
    iconId: string; // Map string ID to actual SVG component in the template
    step: string;
    title: string;
    desc: string;
    imgSrc: string;
    imgAlt: string;
}

export interface PainPointStat {
    stat: string;
    label: string;
    solution?: string;
}

export interface FeatureCard {
    id: string; // Identifier for the type of card
    iconId?: string;
    title: string;
    description: string;
    badges?: string[];
    statValue?: string;
    statLabel?: string;
}

export interface RoiCard {
    country: string;
    flag: string;
    agreement: string;
    normalRate: string;
    ftaRate: string;
    savingsPerShipment: string;
}

export interface RoiSummary {
    label: string;
    amount: string;
}

export interface BeforeAfterRow {
    task: string;
    before: string;
    after: string;
}

export interface FaqItem {
    question: string;
    answer: string;
}

export interface ProductConfig {
    slug: string;
    tenantId: string;
    productCategory: string;
    meta: {
        title: string;
        description: string;
    };
    navbar: {
        ctaText: string;
    };
    hero: {
        kicker: string;
        headlineMain: string;
        headlineHighlight: string;
        subheadline: string;
        socialProof?: string;
        personaLine?: string;
        demoImageSrc: string;
        demoImageAlt: string;
    };
    pain: {
        imageSrc: string;
        imageAlt: string;
        kicker: string;
        headline: string;
        description: string;
        stats: PainPointStat[];
        footnote?: string;
    };
    roi?: {
        kicker: string;
        headline: string;
        cards: RoiCard[];
        summaries: RoiSummary[];
        totalLabel: string;
        totalAmount: string;
        footnote?: string;
    };
    process: {
        kicker: string;
        headline: string;
        steps: ProcessStep[];
    };
    beforeAfter?: {
        kicker: string;
        headline: string;
        badge: string;
        rows: BeforeAfterRow[];
    };
    features: {
        cards: FeatureCard[];
    };
    security: {
        headline: string;
        description: string;
        labels: string[];
        statusLines: { label: string; status: string; statusColor: string }[];
    };
    faq?: {
        kicker: string;
        headline: string;
        items: FaqItem[];
    };
    footer: {
        tagline: string;
        copyright: string;
    };
}
