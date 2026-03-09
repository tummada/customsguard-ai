/**
 * TC-WEB-020 to TC-WEB-025: HS Lookup Tool tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => {
            const filtered = { ...props };
            ['initial', 'animate', 'exit', 'transition', 'whileInView', 'whileHover', 'whileTap', 'viewport'].forEach(k => delete filtered[k]);
            return <div {...filtered}>{children}</div>;
        },
    },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useParams: () => ({ product: 'hs-code' }),
    useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock StructuredData component
vi.mock('@/components/StructuredData', () => ({
    HSCodeToolSchema: () => null,
}));

const mockResults = [
    {
        code: '0306.17.10',
        description: 'Frozen shrimps and prawns',
        descriptionTh: 'กุ้งแช่แข็ง',
        similarity: 0.92,
    },
    {
        code: '0306.17.20',
        description: 'Frozen lobsters',
        descriptionTh: 'กุ้งมังกรแช่แข็ง',
        similarity: 0.85,
    },
];

describe('HSLookupPage', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('TC-WEB-020: renders search form', async () => {
        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        expect(screen.getByPlaceholderText(/กุ้งแช่แข็ง/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ค้นหา/ })).toBeInTheDocument();
    });

    it('TC-WEB-021: search returns and displays results', async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResults),
        } as Response);

        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: 'กุ้งแช่แข็ง' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        await waitFor(() => {
            expect(screen.getByText('0306.17.10')).toBeInTheDocument();
            expect(screen.getByText('กุ้งแช่แข็ง')).toBeInTheDocument();
            expect(screen.getByText('92% match')).toBeInTheDocument();
        });
    });

    it('TC-WEB-022: empty search does not call API', async () => {
        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('TC-WEB-023: whitespace-only search does not call API', async () => {
        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('TC-WEB-024: API error shows no results message', async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: false,
            status: 500,
        } as Response);

        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: 'test query' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        await waitFor(() => {
            expect(screen.getByText(/ไม่พบผลลัพธ์/)).toBeInTheDocument();
        });
    });

    it('TC-WEB-025: network error is handled gracefully', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('Network error'));

        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: 'test query' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        await waitFor(() => {
            expect(screen.getByText(/ไม่พบผลลัพธ์/)).toBeInTheDocument();
        });
    });

    it('TC-WEB-025b: XSS in input is rendered as text, not HTML', async () => {
        const xssResults = [{
            code: '9999.99.99',
            description: '<script>alert("xss")</script>',
            descriptionTh: '<img src=x onerror=alert(1)>',
            similarity: 0.5,
        }];

        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(xssResults),
        } as Response);

        const { default: HSLookupPage } = await import('@/app/[product]/tools/hs-lookup/page');
        render(<HSLookupPage />);

        const input = screen.getByPlaceholderText(/กุ้งแช่แข็ง/);
        fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });
        fireEvent.submit(screen.getByRole('button', { name: /ค้นหา/ }).closest('form')!);

        await waitFor(() => {
            expect(screen.getByText('9999.99.99')).toBeInTheDocument();
        });

        // React renders XSS payloads as escaped text, not executable HTML
        // The text content should contain the literal XSS strings (as text, not HTML)
        const resultCard = screen.getByText('9999.99.99').closest('div')?.parentElement;
        // Verify it's rendered as escaped text (&lt;script&gt;) not raw HTML
        expect(resultCard?.querySelector('script')).toBeNull();
        expect(resultCard?.querySelector('img[onerror]')).toBeNull();
    });
});
