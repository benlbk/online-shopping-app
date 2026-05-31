import knex, { Knex } from 'knex';

let dbInstance: Knex | null = null;

export async function getDbConnection(): Promise<Knex> {
  if (!dbInstance) {
    dbInstance = knex({
      client: 'pg',
      connection: process.env.DATABASE_URL,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 2000,
        createTimeoutMillis: 2000
      }
    });
  }
  return dbInstance;
}

export async function closeDbConnection(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
