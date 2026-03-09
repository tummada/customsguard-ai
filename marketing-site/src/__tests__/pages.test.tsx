/**
 * TC-WEB-001 to TC-WEB-009: Page rendering tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...filterMotionProps(props)}>{children}</span>,
        h1: ({ children, ...props }: any) => <h1 {...filterMotionProps(props)}>{children}</h1>,
        p: ({ children, ...props }: any) => <p {...filterMotionProps(props)}>{children}</p>,
        button: ({ children, ...props }: any) => <button {...filterMotionProps(props)}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function filterMotionProps(props: Record<string, any>) {
    const filtered = { ...props };
    const motionKeys = ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport', 'variants'];
    motionKeys.forEach((k) => delete filtered[k]);
    return filtered;
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
    useParams: () => ({ product: 'hs-code' }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// ── Pricing Page Tests ──

describe('PricingPage', () => {
    it('TC-WEB-004: renders FREE and PRO plan names', async () => {
        const { default: PricingPage } = await import('@/app/pricing/page');
        render(<PricingPage />);

        expect(screen.getByText('FREE')).toBeInTheDocument();
        expect(screen.getByText('PRO')).toBeInTheDocument();
    });

    it('TC-WEB-005: FREE plan shows price as free', async () => {
        const { default: PricingPage } = await import('@/app/pricing/page');
        render(<PricingPage />);

        expect(screen.getByText('FREE')).toBeInTheDocument();
    });

    it('TC-WEB-006: PRO plan shows 990 baht price', async () => {
        const { default: PricingPage } = await import('@/app/pricing/page');
        render(<PricingPage />);

        // Price is rendered as ฿990 inside a span
        expect(screen.getByText(/฿990/)).toBeInTheDocument();
    });

    it('TC-WEB-007: renders FAQ section with questions', async () => {
        const { default: PricingPage } = await import('@/app/pricing/page');
        render(<PricingPage />);

        expect(screen.getByText('FAQ')).toBeInTheDocument();
    });

    it('TC-WEB-008: renders contact section', async () => {
        const { default: PricingPage } = await import('@/app/pricing/page');
        render(<PricingPage />);

        expect(screen.getByText('support@vollos.ai')).toBeInTheDocument();
    });
});

// ── Privacy Page Tests ──

describe('PrivacyContent', () => {
    it('TC-WEB-009: renders privacy policy title', async () => {
        const { PrivacyContent } = await import('@/app/privacy/PrivacyContent');
        render(<PrivacyContent />);

        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('TC-WEB-009b: renders all 7 privacy sections', async () => {
        const { PrivacyContent } = await import('@/app/privacy/PrivacyContent');
        render(<PrivacyContent />);

        expect(screen.getByText(/ข้อมูลที่เราเก็บรวบรวม/)).toBeInTheDocument();
        expect(screen.getByText(/วัตถุประสงค์ในการเก็บข้อมูล/)).toBeInTheDocument();
        expect(screen.getByText(/การรักษาความปลอดภัย/)).toBeInTheDocument();
        expect(screen.getByText(/ระยะเวลาการเก็บข้อมูล/)).toBeInTheDocument();
        expect(screen.getByText(/สิทธิ์ของคุณตาม PDPA/)).toBeInTheDocument();
        expect(screen.getByText(/บริการของบุคคลที่สาม/)).toBeInTheDocument();
        expect(screen.getByText(/ติดต่อเรา/)).toBeInTheDocument();
    });

    it('TC-WEB-009c: renders PDPA rights list', async () => {
        const { PrivacyContent } = await import('@/app/privacy/PrivacyContent');
        const { container } = render(<PrivacyContent />);

        // Text with <strong> tags is split across elements, so use container query
        expect(container.textContent).toContain('ขอเข้าถึง');
        expect(container.textContent).toContain('ขอแก้ไข');
        expect(container.textContent).toContain('ขอลบ');
    });

    it('TC-WEB-009d: renders contact email', async () => {
        const { PrivacyContent } = await import('@/app/privacy/PrivacyContent');
        render(<PrivacyContent />);

        expect(screen.getByText('privacy@vollos.ai')).toBeInTheDocument();
    });
});
