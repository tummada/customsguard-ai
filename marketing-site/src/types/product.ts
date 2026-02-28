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
    };
    process: {
        kicker: string;
        headline: string;
        steps: ProcessStep[];
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
    footer: {
        tagline: string;
        copyright: string;
    };
}
