import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Executes a query with RLS tenant context
 * @param {string} text SQL query
 * @param {any[]} params Query parameters
 * @param {string} tenantId UUID of the tenant
 */
export const queryWithTenant = async (text: string, params: any[], tenantId: string) => {
    const client = await pool.connect();
    try {
        // Standard isolation policy using app.current_tenant_id as per VOLLOS Architect Spec
        await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);
