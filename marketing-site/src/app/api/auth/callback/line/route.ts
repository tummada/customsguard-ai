import { NextRequest, NextResponse } from 'next/server';
import { insertLead } from '@/lib/leads';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/c?error=no_code', request.url));
    }

    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

        // Exchange authorization code for tokens
        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${baseUrl}/api/auth/callback/line`,
                client_id: process.env.NEXT_PUBLIC_LINE_CLIENT_ID!,
                client_secret: process.env.LINE_CLIENT_SECRET!,
            }),
        });

        if (!tokenRes.ok) {
            console.error('LINE token exchange failed:', await tokenRes.text());
            return NextResponse.redirect(new URL('/c?error=line_token', request.url));
        }

        const tokenData = await tokenRes.json();

        // Get user profile
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        // Try to extract email from ID token
        let email = '';
        if (tokenData.id_token) {
            try {
                const payload = JSON.parse(
                    Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString()
                );
                email = payload.email || '';
            } catch { /* email not available */ }
        }

        // Fallback: use LINE userId as identifier
        if (!email) {
            email = `${profile.userId}@line.user`;
        }

        const name = profile.displayName || 'LINE User';

        await insertLead(email, name, 'line');

        return NextResponse.redirect(new URL('/c?registered=true', request.url));
    } catch (error) {
        console.error('LINE OAuth Error:', error);
        return NextResponse.redirect(new URL('/c?error=line_auth', request.url));
    }
}
