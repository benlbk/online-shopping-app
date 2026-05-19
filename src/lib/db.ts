import { Pool } from 'pg';

let pool: Pool;

export async function getDbConnection() {
  if (!pool) {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    
    // Validate required credentials
    if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error('Missing required database configuration');
    }

    pool = new Pool({
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production',
      connectionTimeoutMillis: 2000
    });
  }
  return pool;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await getDbConnection();
    const result = await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      )
    ]);
    return !!result;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
