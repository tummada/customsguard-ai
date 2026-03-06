'use server';

import { insertLead } from '@/lib/leads';

export async function saveSocialLead(provider: string, credential: string) {
    if (provider === 'google') {
        const res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (!res.ok) {
            return { success: false, message: 'การยืนยันตัวตนล้มเหลว' };
        }

        const data = await res.json();
        if (data.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
            return { success: false, message: 'Token ไม่ถูกต้อง' };
        }

        const email: string = data.email;
        const name: string = data.name || email.split('@')[0];

        return await insertLead(email, name, 'google');
    }

    return { success: false, message: 'Unknown provider' };
}
