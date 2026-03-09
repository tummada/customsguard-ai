/**
 * TC-WEB-010 to TC-WEB-015: Social Login Form tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => {
            const filtered = { ...props };
            ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
            return <div {...filtered}>{children}</div>;
        },
        button: ({ children, onClick, disabled, className, ...props }: any) => {
            const filtered = { ...props };
            ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
            return <button onClick={onClick} disabled={disabled} className={className} {...filtered}>{children}</button>;
        },
        p: ({ children, ...props }: any) => {
            const filtered = { ...props };
            ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
            return <p {...filtered}>{children}</p>;
        },
    },
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock the saveSocialLead server action
const mockSaveSocialLead = vi.fn();
vi.mock('@/app/actions', () => ({
    saveSocialLead: (...args: any[]) => mockSaveSocialLead(...args),
}));

// Mock Icons
vi.mock('@/components/Icons', () => ({
    ArrowIcon: () => <span data-testid="arrow-icon" />,
    SparklesIcon: () => <span data-testid="sparkles-icon" />,
    TagIcon: () => <span data-testid="tag-icon" />,
    MessageIcon: () => <span data-testid="message-icon" />,
}));

describe('SocialLoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset URL params
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                pathname: '/c',
                origin: 'http://localhost:3000',
                href: 'http://localhost:3000/c',
            },
            writable: true,
        });
        window.history.replaceState = vi.fn();
    });

    it('TC-WEB-010: renders social login form with benefits', async () => {
        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        expect(screen.getByText(/Founder's Club/i)).toBeInTheDocument();
        expect(screen.getByText(/สิทธิ์เข้าใช้งานรุ่น Beta ก่อนใคร/)).toBeInTheDocument();
        expect(screen.getByText(/จำกัด 10 บริษัทแรก/)).toBeInTheDocument();
    });

    it('TC-WEB-011: shows LINE button text', async () => {
        delete process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
        delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        vi.resetModules();
        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        // Should show LINE-related text in the button
        const lineTexts = screen.getAllByText(/LINE/);
        expect(lineTexts.length).toBeGreaterThan(0);
    });

    it('TC-WEB-012: shows success state when returning from LINE OAuth', async () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?registered=true',
                pathname: '/c',
                origin: 'http://localhost:3000',
                href: 'http://localhost:3000/c?registered=true',
            },
            writable: true,
        });

        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        expect(screen.getByText(/ลงทะเบียนจองสิทธิ์เรียบร้อยแล้ว/)).toBeInTheDocument();
    });

    it('TC-WEB-013: shows error state when OAuth fails', async () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?error=line_auth',
                pathname: '/c',
                origin: 'http://localhost:3000',
                href: 'http://localhost:3000/c?error=line_auth',
            },
            writable: true,
        });

        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        expect(screen.getByText(/เกิดข้อผิดพลาด/)).toBeInTheDocument();
    });

    it('TC-WEB-014: shows privacy policy link', async () => {
        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        const privacyLink = screen.getByText(/นโยบายความเป็นส่วนตัว/);
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
    });

    it('TC-WEB-015: LINE login sets error when no client ID configured', async () => {
        delete process.env.NEXT_PUBLIC_LINE_CLIENT_ID;

        vi.resetModules();
        // Re-mock dependencies after resetModules
        vi.doMock('framer-motion', () => ({
            motion: {
                div: ({ children, ...props }: any) => {
                    const filtered = { ...props };
                    ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
                    return <div {...filtered}>{children}</div>;
                },
                button: ({ children, onClick, disabled, className, ...props }: any) => {
                    const filtered = { ...props };
                    ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
                    return <button onClick={onClick} disabled={disabled} className={className} {...filtered}>{children}</button>;
                },
                p: ({ children, ...props }: any) => {
                    const filtered = { ...props };
                    ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
                    return <p {...filtered}>{children}</p>;
                },
            },
        }));
        vi.doMock('@/app/actions', () => ({
            saveSocialLead: (...args: any[]) => mockSaveSocialLead(...args),
        }));
        vi.doMock('@/components/Icons', () => ({
            ArrowIcon: () => <span data-testid="arrow-icon" />,
            SparklesIcon: () => <span data-testid="sparkles-icon" />,
            TagIcon: () => <span data-testid="tag-icon" />,
            MessageIcon: () => <span data-testid="message-icon" />,
        }));

        const { SocialLoginForm } = await import('@/components/SocialLoginForm');
        render(<SocialLoginForm />);

        // Find and click the LINE button
        const lineButtons = screen.getAllByText(/LINE/);
        const lineButton = lineButtons.find(el => el.closest('button'));
        if (lineButton) {
            fireEvent.click(lineButton.closest('button')!);
        }

        await waitFor(() => {
            expect(screen.getByText(/ระบบ LINE Login ยังไม่พร้อมใช้งาน/)).toBeInTheDocument();
        });
    });
});

// ── Server Action Tests (unit, no DOM) ──

describe('insertLead', () => {
    it('TC-WEB-013b: returns success even without DATABASE_URL (graceful)', async () => {
        delete process.env.DATABASE_URL;

        // Mock the db module
        vi.mock('@/lib/db', () => ({
            queryWithTenant: vi.fn(),
        }));
        vi.mock('@/lib/uuid', () => ({
            generateUUIDv7: () => '01900000-0000-7000-8000-000000000001',
        }));

        const { insertLead } = await import('@/lib/leads');
        const result = await insertLead('test@example.com', 'Test User', 'google');

        expect(result.success).toBe(true);
    });

    it('TC-WEB-013c: handles database error gracefully', async () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

        vi.doMock('@/lib/db', () => ({
            queryWithTenant: vi.fn().mockRejectedValue(new Error('connection refused')),
        }));
        vi.doMock('@/lib/uuid', () => ({
            generateUUIDv7: () => '01900000-0000-7000-8000-000000000002',
        }));

        // Clear module cache so the new mock is used
        vi.resetModules();
        const { insertLead } = await import('@/lib/leads');
        const result = await insertLead('dup@example.com', 'Dup User', 'google');

        expect(result.success).toBe(false);
        expect(result.message).toContain('ไม่สามารถดำเนินการ');

        delete process.env.DATABASE_URL;
    });
});
