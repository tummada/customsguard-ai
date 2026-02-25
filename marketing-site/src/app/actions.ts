'use server';

import { z } from 'zod';
import { queryWithTenant } from '@/lib/db';
import { generateUUIDv7 } from '@/lib/uuid';

const leadSchema = z.object({
    name: z.string().min(2, "Name is too short"),
    company: z.string().min(2, "Company is too short"),
    email: z.string().email("Invalid work email"),
    phone: z.string().min(9, "Phone is too short"),
    category: z.string().optional(),
});

// Mock DEFAULT_TENANT_ID as per VOLLOS Multi-tenant rule
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function submitLead(_prevState: unknown, formData: FormData) {
    // Honeypot: if a bot filled the hidden 'website' field, silently succeed
    const honeypot = formData.get('website');
    if (honeypot) {
        return { success: true as const, message: "Thank you!" };
    }

    const rawData = {
        name: formData.get('name'),
        company: formData.get('company'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        category: formData.get('category'),
    };

    const validation = leadSchema.safeParse(rawData);

    if (!validation.success) {
        return { success: false, errors: validation.error.flatten().fieldErrors };
    }

    const { name, company, email, phone, category } = validation.data;
    const leadId = generateUUIDv7();
    const tenantId = DEFAULT_TENANT_ID;

    try {
        if (process.env.DATABASE_URL) {
            await queryWithTenant(
                `INSERT INTO marketing_leads (id, tenant_id, name, company, email, phone, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [leadId, tenantId, name, company, email, phone, JSON.stringify({ source: 'VOLLOS-Next-Marketing', category })],
                tenantId
            );
        } else {
            console.log('⚠️ Running in UI-Only / Mock Mode');
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        return { success: true, message: 'Value Secured' };
    } catch (error: any) {
        console.error('Lead Capture Error:', error.message);
        return { success: false, message: 'Efficiency Interrupted. Please try again.' };
    }
}
