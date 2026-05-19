import { Pool } from 'pg';
import { z } from 'zod';

// Environment validation
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DB_MAX_CONNECTIONS: z.string().transform(val => parseInt(val, 10)).default('1'),
  DB_IDLE_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).default('10000')
});

const env = envSchema.parse(process.env);

// Configure pool for serverless environment
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_MAX_CONNECTIONS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: 2000
});

export async function checkDatabaseConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getDbConnection() {
  return await pool.connect();
}