import { queryWithTenant } from '@/lib/db';
import { generateUUIDv7 } from '@/lib/uuid';

const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

export async function insertLead(email: string, name: string, provider: string) {
    const leadId = generateUUIDv7();

    try {
        if (process.env.DATABASE_URL) {
            await queryWithTenant(
                `INSERT INTO marketing_leads (id, tenant_id, name, email, metadata)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (tenant_id, email) DO NOTHING`,
                [
                    leadId,
                    DEFAULT_TENANT_ID,
                    name,
                    email,
                    JSON.stringify({ source: 'VOLLOS-Marketing', provider }),
                ],
                DEFAULT_TENANT_ID
            );
        }
        return { success: true, message: 'Value Secured' };
    } catch (error: any) {
        console.error('Lead Capture Error:', error.message);
        return { success: false, message: 'ขออภัย ไม่สามารถดำเนินการได้ในขณะนี้' };
    }
}
