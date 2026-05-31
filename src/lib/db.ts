import { Pool } from 'pg';
import { createPool } from 'generic-pool';

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA
  }
};

// Create a connection pool with proper error handling
const pool = createPool({
  create: async () => {
    const client = new Pool(dbConfig);
    await client.connect();
    return client;
  },
  destroy: async (client) => {
    await client.end();
  }
}, {
  max: 10,
  min: 2,
  acquireTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  evictionRunIntervalMillis: 1000
});

export async function getDbConnection() {
  try {
    return await pool.acquire();
  } catch (error) {
    console.error('Failed to get database connection:', error);
    throw error;
  }
}