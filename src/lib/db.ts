import { Pool, PoolClient } from 'pg';
import { config } from '@/config';

let pool: Pool | null = null;

export async function getDbConnection(): Promise<PoolClient> {
  if (!pool) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      ssl: config.database.ssl ? {
        rejectUnauthorized: false
      } : undefined
    });

    // Error handling for the pool
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      process.exit(-1);
    });
  }

  return await pool.connect();
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
