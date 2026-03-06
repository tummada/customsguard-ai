import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Executes a query with RLS tenant context inside a transaction.
 * Uses parameterized set_config to prevent SQL injection.
 */
export const queryWithTenant = async (text: string, params: any[], tenantId: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
        const res = await client.query(text, params);
        await client.query('COMMIT');
        return res;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);
