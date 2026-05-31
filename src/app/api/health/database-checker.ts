import { Pool } from 'pg';

export class DatabaseHealthChecker {
  private timeout: number;

  constructor(timeoutMs: number) {
    this.timeout = timeoutMs;
  }

  async check(db: Pool): Promise<boolean> {
    try {
      const checkPromise = db.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), this.timeout)
      );

      await Promise.race([checkPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}