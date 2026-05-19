import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 120000, // Close idle connections after 2 minutes
      connectionTimeoutMillis: 5000 // Connection timeout
    });
  }
  return pool;
}

export async function getDbConnection(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await getDbConnection();
    const result = await client.query('SELECT 1');
    return result.rows.length === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}